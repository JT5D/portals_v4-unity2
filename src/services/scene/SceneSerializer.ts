/**
 * SceneSerializer - Converts Redux state ↔ Scene Manifest
 * 
 * Purpose: Serializes the AR scene state for persistence and deserializes
 * saved manifests back into Redux-compatible state.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ModelData = require('../../screens/FigmentAR/model/ModelItems');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PortalData = require('../../screens/FigmentAR/model/PortalItems');

// Schema version for future migrations
const MANIFEST_FORMAT = 'portals-v1';

/**
 * Serializes Redux AR state to a SceneManifest for storage
 */
export function serializeScene(reduxState: any, sceneSettings: any = {}): SceneManifest {
    const { modelItems, portalItems, mediaItems, postProcessEffects } = reduxState.arobjects || {};

    const objects: SceneObject[] = [];

    // Serialize model items
    if (modelItems) {
        Object.values(modelItems).forEach((model: any) => {
            if (model.hidden) return; // Skip hidden items

            const isStarterAsset = model.index >= 0;
            const modelDef = isStarterAsset ? ModelData.getModelArray()?.[model.index] : null;

            objects.push({
                id: model.uuid,
                type: 'model',
                position: model.position || [0, 0, -1],
                rotation: model.rotation || [0, 0, 0],
                scale: model.scale || modelDef?.scale || [1, 1, 1],
                assetRef: isStarterAsset ? `starter:model:${model.index}` : model.source?.uri,
                isStarterAsset,
                modelData: {
                    type: model.type || modelDef?.type || 'GLB',
                    animation: model.animation || modelDef?.animation,
                    materials: model.materials,
                    physics: model.physics,
                },
                createdAt: model.createdAt || Date.now(),
                modifiedAt: Date.now(),
                addedBy: model.addedBy || 'owner',
            });
        });
    }

    // Serialize portal items
    if (portalItems) {
        Object.values(portalItems).forEach((portal: any) => {
            if (portal.hidden) return;

            const portalDef = PortalData.getPortalArray()?.[portal.index];

            objects.push({
                id: portal.uuid,
                type: 'portal',
                position: portal.position || [0, 0, -2],
                rotation: portal.rotation || [0, 0, 0],
                scale: portal.scale || portalDef?.scale || [1, 1, 1],
                assetRef: `starter:portal:${portal.index}`,
                isStarterAsset: true,
                portalData: {
                    backgroundUrl: portal.portal360Image?.uri,
                    portalIndex: portal.index,
                },
                createdAt: portal.createdAt || Date.now(),
                modifiedAt: Date.now(),
                addedBy: portal.addedBy || 'owner',
            });
        });
    }

    // Serialize media items (images, videos)
    if (mediaItems) {
        Object.values(mediaItems).forEach((media: any) => {
            if (media.hidden) return;

            objects.push({
                id: media.uuid,
                type: media.type?.toLowerCase() === 'video' ? 'video' : 'image',
                position: media.position || [0, 0, -1],
                rotation: media.rotation || [0, 0, 0],
                scale: media.scale || [1, 1, 1],
                assetRef: media.source?.uri,
                isStarterAsset: false,
                mediaData: {
                    width: media.width || 1,
                    height: media.height || 1,
                    autoplay: media.autoplay ?? true,
                    loop: media.loop ?? true,
                },
                createdAt: media.createdAt || Date.now(),
                modifiedAt: Date.now(),
                addedBy: media.addedBy || 'owner',
            });
        });
    }

    return {
        version: sceneSettings.version || 1,
        format: MANIFEST_FORMAT,
        settings: {
            hdriBackground: sceneSettings.hdriBackground,
            ambientLight: sceneSettings.ambientLight ?? 0.5,
            postProcessEffect: postProcessEffects,
        },
        objects,
    };
}

/**
 * Deserializes a SceneManifest into Redux-compatible action payload
 */
export function deserializeScene(manifest: SceneManifest): any {
    const sceneData: { objects: any[]; postProcessEffects?: string; hdriBackground?: string } = {
        objects: [],
        postProcessEffects: manifest.settings?.postProcessEffect,
        hdriBackground: manifest.settings?.hdriBackground,
    };

    manifest.objects.forEach((obj) => {
        if (obj.type === 'model') {
            sceneData.objects.push({
                id: obj.id,
                type: 'viro_model',
                modelIndex: obj.isStarterAsset ? parseInt(obj.assetRef.split(':')[2]) : -1,
                uri: obj.isStarterAsset ? null : obj.assetRef,
                position: obj.position,
                rotation: obj.rotation,
                scale: obj.scale,
                animation: obj.modelData?.animation,
                materials: obj.modelData?.materials,
                physics: obj.modelData?.physics,
                modelType: obj.modelData?.type || 'GLB',
            });
        } else if (obj.type === 'portal') {
            sceneData.objects.push({
                id: obj.id,
                type: 'viro_portal',
                portalIndex: obj.portalData?.portalIndex,
                portal360Image: obj.portalData?.backgroundUrl ? { uri: obj.portalData.backgroundUrl } : null,
                position: obj.position,
                rotation: obj.rotation,
                scale: obj.scale,
            });
        } else if (obj.type === 'image' || obj.type === 'video') {
            sceneData.objects.push({
                id: obj.id,
                type: obj.type,
                uri: obj.assetRef,
                position: obj.position,
                rotation: obj.rotation,
                scale: obj.scale,
                width: obj.mediaData?.width || 1,
                height: obj.mediaData?.height || 1,
                autoplay: obj.mediaData?.autoplay ?? true,
                loop: obj.mediaData?.loop ?? true,
            });
        }
    });

    return sceneData;
}

// TypeScript interfaces
export interface SceneManifest {
    version: number;
    format: string;
    settings: {
        hdriBackground?: string;
        ambientLight: number;
        postProcessEffect?: string;
    };
    objects: SceneObject[];
}

export interface SceneObject {
    id: string;
    type: 'model' | 'portal' | 'image' | 'video' | 'audio' | 'splat';
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    assetRef: string;
    isStarterAsset: boolean;
    modelData?: {
        type: 'GLB' | 'VRX' | 'OBJ';
        animation?: { name: string; loop: boolean; run: boolean };
        materials?: any;
        physics?: any;
    };
    portalData?: {
        backgroundUrl?: string;
        portalIndex: number;
    };
    mediaData?: {
        width: number;
        height: number;
        autoplay: boolean;
        loop: boolean;
    };
    createdAt: number;
    modifiedAt: number;
    addedBy: string;
}
