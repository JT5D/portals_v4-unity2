import { getParam } from "../../../../../engine/engine_utils.js";
import { GameObject } from "../../../../Component.js";
import type { IUSDExporterExtension } from "../../Extension.js";
import type { USDObject, USDWriter, USDZExporterContext } from "../../ThreeUSDZExporter.js";
import { AudioExtension } from "./AudioExtension.js";
import { ActionModel, type BehaviorModel, GroupActionModel, IBehaviorElement, type Target, TriggerModel } from "./BehavioursBuilder.js";

const debug = getParam("debugusdzbehaviours");

export interface UsdzBehaviour {
    createBehaviours?(ext: BehaviorExtension, model: USDObject, context: USDZExporterContext): void;
    beforeCreateDocument?(ext: BehaviorExtension, context: USDZExporterContext): void | Promise<void>;
    afterCreateDocument?(ext: BehaviorExtension, context: USDZExporterContext): void | Promise<void>
    afterSerialize?(ext: BehaviorExtension, context: USDZExporterContext): void;
}

/** internal USDZ behaviours extension */
export class BehaviorExtension implements IUSDExporterExtension {

    get extensionName(): string {
        return "Behaviour";
    }

    private behaviours: BehaviorModel[] = [];

    addBehavior(beh: BehaviorModel) {
        this.behaviours.push(beh);
    }

    /** Register audio clip for USDZ export. The clip will be embedded in the resulting file. */
    addAudioClip(clipUrl: string) {
        if (!clipUrl) return "";
        if (typeof clipUrl !== "string") return "";

        const clipName = AudioExtension.getName(clipUrl);
        const filesKey = "audio/" + clipName;

        this.audioClips.push({clipUrl, filesKey});

        return filesKey;
    }

    behaviourComponents: Array<UsdzBehaviour> = [];
    private behaviourComponentsCopy: Array<UsdzBehaviour> = [];
    private audioClips: Array<{clipUrl: string, filesKey: string}> = [];
    private audioClipsCopy: Array<{clipUrl: string, filesKey: string}> = [];
    private targetUuids: Set<string> = new Set();
    
    getAllTargetUuids() {
        return this.targetUuids;
    }

    onBeforeBuildDocument(context: USDZExporterContext) {
        if (!context.root) return Promise.resolve();
        const beforeCreateDocumentPromises : Array<Promise<any>> = [];
        context.root.traverse(e => {
            GameObject.foreachComponent(e, (comp) => {
                const c = comp as unknown as UsdzBehaviour;
                // Test if the components has any of the behaviour type methods
                if (
                    typeof c.createBehaviours === "function" ||
                    typeof c.beforeCreateDocument === "function" ||
                    typeof c.afterCreateDocument === "function" ||
                    typeof c.afterSerialize === "function"
                ) {
                    this.behaviourComponents.push(c);
                    // run beforeCreateDocument. We run them in parallel if any of them is async because the order in which this is invoked on the components is not guaranteed anyways 
                    // (or at least no behaviour component should rely on another to have finished this method)
                    const res = c.beforeCreateDocument?.call(c, this, context);
                    if(res instanceof Promise) {
                        beforeCreateDocumentPromises.push(res);
                    }
                }
            }, false);
        });
        if (debug) console.log("onBeforeBuildDocument: all components", this.behaviourComponents);
        return Promise.all(beforeCreateDocumentPromises);
    }

    onExportObject(_object, model: USDObject, context) {
        for (const beh of this.behaviourComponents) {
            // if (debug) console.log("onExportObject: createBehaviours", beh);
            beh.createBehaviours?.call(beh, this, model, context);
        }
    }

    onAfterBuildDocument(context: USDZExporterContext) {
        for (const beh of this.behaviourComponents) {
            if (typeof beh.afterCreateDocument === "function")
                beh.afterCreateDocument(this, context);
        }
        this.behaviourComponentsCopy = this.behaviourComponents.slice();
        this.behaviourComponents.length = 0;
        this.audioClipsCopy = this.audioClips.slice();
        this.audioClips.length = 0;

        // We want to know all trigger sources and action targets.
        // These can be nested in Group Actions.

        const triggerSources = new Set<Target>();
        const actionTargets = new Set<Target>();
        const targetUuids = new Set<string>();
        const playAnimationActions = new Set<ActionModel>();

        // We're assembling a mermaid graph on the go, for easier debugging
        const createMermaidGraphForDebugging = debug;
        let mermaidGraph = "graph LR\n";
        let mermaidGraphTopLevel = "";

        function collectAction (actionModel: IBehaviorElement) {
            if (actionModel instanceof GroupActionModel) {
                if (createMermaidGraphForDebugging) mermaidGraph += `subgraph Group_${actionModel.id}\n`;
                for (const action of actionModel.actions) {
                    if (createMermaidGraphForDebugging) mermaidGraph += `${actionModel.id}[${actionModel.id}] -- ${actionModel.type},loops:${actionModel.loops} --> ${action.id}[${action.id}]\n`;
                    collectAction(action);
                }
                if (createMermaidGraphForDebugging) mermaidGraph += `end\n`;
            }
            else if (actionModel instanceof ActionModel) {
                if (actionModel.tokenId === "StartAnimation") {
                    playAnimationActions.add(actionModel);
                }
                let actionType = actionModel.tokenId;
                if (actionModel.type !== undefined) actionType += ":" + actionModel.type;
                const affected = actionModel.affectedObjects;
                if (affected) {
                    if (Array.isArray(affected)) {
                        for (const a of affected) {
                            actionTargets.add(a as Target);
                            //@ts-ignore
                            if (createMermaidGraphForDebugging) mermaidGraphTopLevel += `${actionModel.id}[${actionModel.id}\n${actionType}] -- ${actionType} --> ${a.uuid}(("${a.displayName || a.name || a.uuid}"))\n`;
                        }
                    }
                    else if (typeof affected === "object") {
                        actionTargets.add(affected as Target);
                        //@ts-ignore
                        if (createMermaidGraphForDebugging) mermaidGraphTopLevel += `${actionModel.id}[${actionModel.id}\n${actionType}] -- ${actionType} --> ${affected.uuid}(("${affected.displayName || affected.name || affected.uuid}"))\n`;
                    }
                    else if (typeof affected === "string") {
                        actionTargets.add({uuid: affected} as any as Target);
                    }
                }

                const xform = actionModel.xFormTarget;
                if (xform) {
                    if (typeof xform === "object") {
                        actionTargets.add(xform as Target);
                        //@ts-ignore
                        if (createMermaidGraphForDebugging) mermaidGraphTopLevel += `${actionModel.id}[${actionModel.id}\n${actionType}] -- ${actionType} --> ${xform.uuid}(("${xform.displayName || xform.name || xform.uuid}"))\n`;
                    }
                    else if (typeof xform === "string") {
                        actionTargets.add({uuid: xform} as any as Target);
                    }
                }
            }
        }

        function collectTrigger(trigger: IBehaviorElement | IBehaviorElement[], action: IBehaviorElement) {
            if (Array.isArray(trigger)) {
                for (const t of trigger)
                    collectTrigger(t, action);
            }
            else if (trigger instanceof TriggerModel) {
                let triggerType = trigger.tokenId;
                if (trigger.type !== undefined) triggerType += ":" + trigger.type;
                if (typeof trigger.targetId === "object") {
                    triggerSources.add(trigger.targetId as Target);
                    //@ts-ignore
                    if (createMermaidGraphForDebugging) mermaidGraphTopLevel += `${trigger.targetId.uuid}(("${trigger.targetId.displayName}")) --> ${trigger.id}[${trigger.id}\n${triggerType}]\n`;
                }
                //@ts-ignore
                if (createMermaidGraphForDebugging) mermaidGraph += `${trigger.id}((${trigger.id})) -- ${triggerType} --> ${action.id}[${action.tokenId || action.id}]\n`;
            }
        }

        // collect all targets of all triggers and actions
        for (const beh of this.behaviours) {
            if (createMermaidGraphForDebugging) mermaidGraph += `subgraph ${beh.id}\n`;
            collectAction(beh.action);
            collectTrigger(beh.trigger, beh.action);
            if (createMermaidGraphForDebugging) mermaidGraph += `end\n`;
        }
        if (createMermaidGraphForDebugging) mermaidGraph += "\n" + mermaidGraphTopLevel;
        
        if (createMermaidGraphForDebugging) {
            console.log("All USDZ behaviours", this.behaviours);
            if (this.behaviours.length) {
                console.warn("The Mermaid graph can be pasted into https://massive-mermaid.glitch.me/ or https://mermaid.live/edit. It should be in your clipboard already!");
                console.log(mermaidGraph);
                // copy to clipboard, can be pasted into https://massive-mermaid.glitch.me/ or https://mermaid.live/edit
                navigator.clipboard.writeText(mermaidGraph);
            }
        }

        {
            // Validation: Check if any PlayAnimation actions are overlapping.
            // That means: the target of one of the actions is a child of any other target of another action.
            // This leads to undefined behaviour in the runtime.
            // See FB15122057 for more information.
            let animationsGraph = "gantt\ntitle Animations\ndateFormat X\naxisFormat %s\n";
            const arr = Array.from(playAnimationActions);
            const animationTargetObjects = new Set<USDObject>();
            for (const a of arr) {
                if (!a.affectedObjects) continue;
                if (typeof a.affectedObjects === "string") continue;
                if (Array.isArray(a.affectedObjects)) {
                    for (const o of a.affectedObjects) {
                        animationTargetObjects.add(o as USDObject);
                    }
                }
                else {
                    animationTargetObjects.add(a.affectedObjects as USDObject);
                }
                
                if (createMermaidGraphForDebugging) {
                    animationsGraph += `section ${a.animationName} (${a.id})\n`;
                    animationsGraph += `${a.id} : ${a.start}, ${a.duration}s\n`;
                }
            }

            if (createMermaidGraphForDebugging && playAnimationActions.size) {
                console.log(animationsGraph);
            }

            const animationTargetPaths = new Set<{path: string, obj: USDObject}>();
            for (const o of animationTargetObjects) {
                if (!o.getPath) {
                    console.error("USDZExporter: Animation target object has no getPath method. This is likely a bug", o);
                }
                let path = o.getPath();
                // remove < and >, these are part of USD paths
                if (path.startsWith("<")) path = path.substring(1);
                if (path.endsWith(">")) path = path.substring(0, path.length - 1);
                animationTargetPaths.add({path, obj: o});
            }

            // order by length
            const sortedPaths = Array.from(animationTargetPaths).sort((a, b) => a.path.length - b.path.length);
            const overlappingTargets = new Array<{child: string, parent: string}>();
            for (let i = 0; i < sortedPaths.length; i++) {
                for (let j = i + 1; j < sortedPaths.length; j++) {
                    if (sortedPaths[j].path.startsWith(sortedPaths[i].path)) {
                        const c = sortedPaths[j];
                        const p = sortedPaths[i];
                        overlappingTargets.push({child: c.obj.displayName + " (" + c.path + ")", parent: p.obj.displayName + " (" + p.path + ")"});
                    }
                }
            }

            // There's some overlapping animation targets – we should warn here, so that this
            // can be resolved in the scene.
            if (overlappingTargets.length) {
                console.warn("USDZExporter: There are overlapping PlayAnimation actions. This can lead to undefined runtime behaviour when playing multiple animations. Please restructure the hierarchy so that animations don't overlap.", 
                    {
                        overlappingTargets,
                        playAnimationActions,
                    }
                );
            }
        }


        for (const source of new Set([...triggerSources, ...actionTargets])) {
            // shouldn't happen but strictly speaking a trigger source could be set to an array
            if (Array.isArray(source)) {
                for (const s of source)
                    targetUuids.add(s.uuid);
            }
            else
                targetUuids.add(source.uuid);
        }

        if (debug) console.log("All Behavior trigger sources and action targets", triggerSources, actionTargets, targetUuids);
        this.targetUuids = new Set(targetUuids);
    }

    onAfterHierarchy(context: USDZExporterContext, writer: USDWriter) {
        if (this.behaviours?.length) {
            writer.beginBlock('def Scope "Behaviors"');

            for (const beh of this.behaviours)
                beh.writeTo(this, context.document, writer);

            writer.closeBlock();
        }
    }

    async onAfterSerialize(context: USDZExporterContext) {
        if (debug) console.log("onAfterSerialize behaviours", this.behaviourComponentsCopy)
        
        for (const beh of this.behaviourComponentsCopy) {
            
            if (typeof beh.afterSerialize === "function") {

                const isAsync = beh.afterSerialize.constructor.name === "AsyncFunction";
				
				if ( isAsync ) {
					await beh.afterSerialize(this, context);
				} else {
					beh.afterSerialize(this, context);
				}
            }
        }

        for (const { clipUrl, filesKey } of this.audioClipsCopy) {
    
            // if the clip was already added, don't add it again
            if (context.files[filesKey]) return;
    
            const audio = await fetch(clipUrl);
            const audioBlob = await audio.blob();
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioData: Uint8Array = new Uint8Array(arrayBuffer)
            context.files[filesKey] = audioData;
        }

        // cleanup
        this.behaviourComponentsCopy.length = 0;
        this.audioClipsCopy.length = 0;
    }
}