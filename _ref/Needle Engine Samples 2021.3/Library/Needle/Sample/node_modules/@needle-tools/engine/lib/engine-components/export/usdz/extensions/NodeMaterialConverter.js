import { formatsWithAlphaChannel, makeNameSafeForUSD } from "../ThreeUSDZExporter.js";
const materialRoot = '</StageRoot/Materials';
function buildNodeMaterial(nodeMaterial, materialName, textures) {
    const collectedNodeTypes = new Map();
    const getUniqueNodeName = (node) => {
        const type = node["type___needle"];
        const typeMap = collectedNodeTypes.get(type) || new Map();
        collectedNodeTypes.set(type, typeMap);
        if (!typeMap.has(node)) {
            const name = `${type}${typeMap.size ? `_${typeMap.size}` : ""}`;
            typeMap.set(node, name);
        }
        return typeMap.get(node);
    };
    const colorNodesToBeExported = nodeMaterial.colorNode ? getNodesToExport(nodeMaterial.colorNode) : [];
    const colorOutputString = nodeMaterial.colorNode
        ? `color3f inputs:diffuseColor.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(colorNodesToBeExported.values().next().value)}.outputs:out>`
        : "";
    const roughnessNodesToBeExported = nodeMaterial.roughnessNode ? getNodesToExport(nodeMaterial.roughnessNode) : [];
    const roughnessOutputString = nodeMaterial.roughnessNode
        ? `float inputs:roughness.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(roughnessNodesToBeExported.values().next().value)}.outputs:out>`
        : "";
    const normalNodesToBeExported = nodeMaterial.normalNode ? getNodesToExport(nodeMaterial.normalNode) : [];
    const normalOutputString = nodeMaterial.normalNode
        ? `float3 inputs:normal.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(normalNodesToBeExported.values().next().value)}.outputs:out>`
        : "";
    const metallicNodesToBeExported = nodeMaterial.metalnessNode ? getNodesToExport(nodeMaterial.metalnessNode) : [];
    const metallicOutputString = nodeMaterial.metalnessNode
        ? `float inputs:metallic.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(metallicNodesToBeExported.values().next().value)}.outputs:out>`
        : "";
    const combinedSetOfAllNodesToExport = new Set([...colorNodesToBeExported, ...roughnessNodesToBeExported, ...normalNodesToBeExported, ...metallicNodesToBeExported]);
    const shaderOutput = getShadersFromNodes(combinedSetOfAllNodesToExport, materialName, textures, getUniqueNodeName);
    console.debug(shaderOutput);
    return `

	def Material "${materialName}" ${nodeMaterial.name ? `(
		displayName = "${nodeMaterial.name}"
	)` : ''}
	{
		token outputs:mtlx:surface.connect = ${materialRoot}/${materialName}/N_mtlxsurface.outputs:surface>

		def Shader "N_mtlxsurface"
		{
			uniform token info:id = "ND_UsdPreviewSurface_surfaceshader"
			${colorOutputString}
			${roughnessOutputString}
			${normalOutputString}
			${metallicOutputString}
			token outputs:surface
		}
		
		${shaderOutput}
		
	}`;
}
function getNodesToExport(rootNode) {
    const getNodeType = (node) => {
        if (node.nodeType)
            return node.nodeType;
        switch (node.type) {
            case "TimerNode": return "float";
            case "TextureNode": return undefined;
            case "ConvertNode": return node.convertTo;
            default: return undefined;
        }
    };
    const getSetOfAllNodes = (rootNode) => {
        const setOfAllNodes = new Set();
        const collectNode = (node) => {
            if (!node.isNode || setOfAllNodes.has(node))
                return;
            if (!node["nodeType___needle"]) {
                node["nodeType___needle"] = getNodeType(node);
            }
            if (node.shaderNode) {
                node["type___needle"] = "ShaderCallNodeInternal";
                node["shaderNodeLayoutName___needle"] = node.shaderNode.layout.name.slice(3);
            }
            else {
                node["type___needle"] = node.type;
            }
            setOfAllNodes.add(node);
            for (const key in node) {
                if (node[key]?.isNode) {
                    collectNode(node[key]);
                    node["nodeType___needle"] ||= node[key]["nodeType___needle"];
                }
                if (Array.isArray(node[key])) {
                    node[key].forEach(child => {
                        if (child.isNode) {
                            collectNode(child);
                            node["nodeType___needle"] ||= child["nodeType___needle"];
                        }
                    });
                }
            }
        };
        collectNode(rootNode);
        return setOfAllNodes;
    };
    const isSelfConversionNode = (node) => {
        if (node.type === "ConvertNode") {
            if (node.convertTo === node.node["nodeType___needle"]) {
                return true;
            }
            else if (node.node.type === "ConstNode") {
                if (node.convertTo === "vec4" && node.node.value.isVector4) {
                    return true;
                }
                else if (node.convertTo === "vec3" && node.node.value.isVector3) {
                    return true;
                }
                else if (node.convertTo === "vec2" && node.node.value.isVector2) {
                    return true;
                }
                else if (node.convertTo === "color" && node.node.value.isColor) {
                    return true;
                }
                else if (node.convertTo === "float" && typeof node.node.value === 'number') {
                    return true;
                }
            }
            else if (node.node.type == "SplitNode") {
                if (node.convertTo == "float" && node.node.components.length === 1) {
                    return true;
                }
            }
        }
        return false;
    };
    const getNextValidNode = (node) => {
        while (nodeShouldNotBeExported(node)) {
            if (!node.node && node.shaderNode) {
                node = node.inputNodes[0];
            }
            else {
                node = node.node ?? node.aNode ?? node.bNode ?? node.cNode;
            }
        }
        return node;
    };
    const nodeShouldNotBeExported = (node) => {
        const ignorableNodeTypes = ["UniformNode", "UniformGroupNode", "ShaderNodeInternal"];
        return !node || isSelfConversionNode(node) || ignorableNodeTypes.includes(node["type___needle"]) || node["type___needle"] === undefined;
    };
    const getParent = (currNode, nodeSet) => {
        for (const node of nodeSet) {
            for (const key in node) {
                if (node[key]?.isNode && node[key] === currNode) {
                    return { parent: node, label: key };
                }
                if (Array.isArray(node[key])) {
                    const child = node[key].find(childNode => childNode.isNode && childNode === currNode);
                    if (child)
                        return { parent: node, label: key };
                }
            }
        }
        return null;
    };
    const updateNodeReferences = (node, refKeys) => {
        if (node.shaderNode) {
            node.inputNodes[0] = getNextValidNode(node.inputNodes[0]);
        }
        else if (Array.isArray(node.nodes)) {
            for (let i = 0; i < node.nodes.length; i++) {
                if (node.nodes[i] && nodeShouldNotBeExported(node.nodes[i])) {
                    node.nodes[i] = getNextValidNode(node.nodes[i]);
                }
            }
        }
        else {
            refKeys.forEach(key => {
                if (node[key] && nodeShouldNotBeExported(node[key])) {
                    node[key] = getNextValidNode(node[key]);
                }
            });
        }
    };
    const setMixNodeMixToFloat = (node) => {
        if (node.type === "MathNode" && node.method === "mix") {
            node.cNode["nodeType___needle"] = "float";
            if (node.cNode.type === "ConvertNode") {
                node.cNode.convertTo = "float";
            }
        }
    };
    const setConstNodeTypeToParentType = (node, parentResponse) => {
        if (!(parentResponse.label === 'cNode' && parentResponse.parent.type === "MathNode" && parentResponse.parent.method === "mix")) {
            if (parentResponse.parent.type === "JoinNode") {
                node["nodeType___needle"] = "float";
            }
            else {
                node["nodeType___needle"] = parentResponse.parent["nodeType___needle"];
            }
        }
    };
    const isConvertVector4ToColorNode = (node) => (node?.type === "ConvertNode" && node["nodeType___needle"] === "color" && node.node["nodeType___needle"] === "vec4");
    const createVec3ToColorConversionNode = (node, allNodes) => {
        node.convertTo = "vec3";
        node["nodeType___needle"] = "vec3";
        const newNode = {
            type: "ConvertNode",
            convertTo: "color",
            node: node,
            isNode: true,
            nodeType___needle: "color",
            type___needle: "ConvertNode"
        };
        const parentInfo = getParent(node, allNodes);
        if (parentInfo?.parent) {
            parentInfo.parent[parentInfo.label] = newNode;
        }
        return newNode;
    };
    const isConvertFromTextureNode = (node) => (node?.type === "ConvertNode" && node.node.type === "TextureNode" && node["nodeType___needle"] !== node.node["nodeType___needle"]);
    const pruneNodes = (allNodes) => {
        const nodesToBeExported = new Set();
        for (let node of allNodes) {
            if (nodeShouldNotBeExported(node))
                continue;
            // Math mix nodes take a mix input that should always be a float, the typing gets messed up here because
            // the other inputs that are being mixed can be anything and if we have a convert or a const that goes
            // into the mix input, it gets set as whatever the output of the mix should be, not float. Here we make
            // sure it will be float
            setMixNodeMixToFloat(node);
            if (node.type == "SplitNode") {
                const parentResponse = getParent(node, allNodes);
                if (node.components.length === 1) {
                    node["nodeType___needle"] = "float";
                }
                else if (parentResponse) {
                    // TODO: this may not be sufficient and it may be better to always count the component lengths
                    node["nodeType___needle"] = parentResponse.parent["nodeType___needle"];
                }
                else
                    throw new Error("SplitNode without parent found, this should not happen");
            }
            // Here we check child nodes to update the connections if they will be ignored later
            updateNodeReferences(node, ["node", "aNode", "bNode", "cNode"]);
            // Const nodes don't always have a type and sometimes they need to be converted from a value of 0 -> [0, 0, 0]
            // this function does that conversion
            if (node.type == "ConstNode" && node.nodeType == null) {
                setConstNodeTypeToParentType(node, getParent(node, allNodes));
            }
            if (isConvertVector4ToColorNode(node)) {
                nodesToBeExported.add(createVec3ToColorConversionNode(node, allNodes));
            }
            // We want Texture nodes to export the type they need, rather than something else and then convert
            // here if we have a convert above a Texture that we missed on the first pass because there was
            // some other node in between to prune, set the type on the Texture correctly and kill the convert
            if (isConvertFromTextureNode(node)) {
                node.node["nodeType___needle"] = node.convertTo;
                const parentInfo = getParent(node, allNodes);
                if (parentInfo?.parent) {
                    parentInfo.parent[parentInfo.label] = node.node;
                }
                node = node.node;
            }
            nodesToBeExported.add(node);
        }
        return nodesToBeExported;
    };
    const setOfAllNodes = getSetOfAllNodes(rootNode);
    const prunedNodes = pruneNodes(setOfAllNodes);
    return prunedNodes;
}
function getConstValueString(value, type) {
    switch (type) {
        case "float4":
            return value.isVector4
                ? `(${value.x}, ${value.y}, ${value.z}, ${value.w})`
                : `(${value}, ${value}, ${value}, ${value})`;
        case "float3":
            return value.isVector3
                ? `(${value.x}, ${value.y}, ${value.z})`
                : `(${value}, ${value}, ${value})`;
        case "float2":
            return value.isVector2
                ? `(${value.x}, ${value.y})`
                : `(${value}, ${value})`;
        case "color3f":
            return value.isColor
                ? `(${value.r}, ${value.g}, ${value.b})`
                : `(${value}, ${value}, ${value})`;
        default:
            return (value.isVector4 || value.isVector3 || value.isVector2)
                ? `${value.x}`
                : value.isColor
                    ? `${value.r}`
                    : `${value}`;
    }
}
function TSLNodeToUsdShadeString(node, materialName, getUniqueNodeName, textures) {
    const pad = '        ';
    const getType = (nodeType) => {
        const types = {
            float: "float",
            vec2: "vector2",
            vec3: "vector3",
            vec4: "vector4",
            color: "color3"
        };
        return types[nodeType] || "float";
    };
    const getUsdType = (nodeType) => {
        const usdTypes = {
            float: "float",
            vec2: "float2",
            vec3: "float3",
            vec4: "float4",
            color: "color3f"
        };
        return usdTypes[nodeType] || "float";
    };
    const type = node["type___needle"];
    const ndType = node["nodeType___needle"];
    const mtlxNdType = getType(ndType);
    let usdNdType = getUsdType(ndType);
    let usdShadeNodeName = "";
    const inputs = new Array();
    switch (type) {
        case "UniformGroupNode":
        case "UniformNode":
            // break out of node loop
            return "";
        case "TimerNode":
            usdShadeNodeName = "time_float";
            break;
        case "ConstNode":
            usdShadeNodeName = "constant_" + mtlxNdType;
            inputs.push(`${usdNdType} inputs:value = ${getConstValueString(node.value, usdNdType)}`);
            break;
        case "JoinNode":
            usdShadeNodeName = "combine" + node.nodes.length + "_" + mtlxNdType;
            let i = 1;
            for (const childNode of node.nodes) {
                inputs.push(`float inputs:in${i++}.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(childNode)}.outputs:out>`);
            }
            break;
        case "ConvertNode":
            const inputType = getType(node.node["nodeType___needle"]);
            usdShadeNodeName = "convert_" + inputType + "_" + mtlxNdType;
            if (node.node)
                inputs.push(`${getUsdType(node.node["nodeType___needle"])} inputs:in.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.node)}.outputs:out>`);
            break;
        case "MathNode":
            usdShadeNodeName = node.method + "_" + mtlxNdType;
            if (node.aNode && !node.bNode)
                inputs.push(`${getUsdType(node.aNode["nodeType___needle"])} inputs:in.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.aNode)}.outputs:out>`);
            if (node.aNode && node.bNode && !node.cNode) {
                inputs.push(`${getUsdType(node.aNode["nodeType___needle"])} inputs:in1.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.aNode)}.outputs:out>`);
                inputs.push(`${getUsdType(node.bNode["nodeType___needle"])} inputs:in2.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.bNode)}.outputs:out>`);
            }
            if (node.aNode && node.bNode && node.cNode && node.method == "clamp") {
                inputs.push(`${getUsdType(node.aNode["nodeType___needle"])} inputs:in.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.aNode)}.outputs:out>`);
                inputs.push(`${getUsdType(node.bNode["nodeType___needle"])} inputs:low.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.bNode)}.outputs:out>`);
                inputs.push(`${getUsdType(node.cNode["nodeType___needle"])} inputs:high.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.cNode)}.outputs:out>`);
            }
            if (node.aNode && node.bNode && node.cNode && node.method == "mix") {
                inputs.push(`${getUsdType(node.aNode["nodeType___needle"])} inputs:fg.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.bNode)}.outputs:out>`);
                inputs.push(`${getUsdType(node.bNode["nodeType___needle"])} inputs:bg.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.aNode)}.outputs:out>`);
                inputs.push(`float inputs:mix.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.cNode)}.outputs:out>`);
            }
            break;
        case "OperatorNode":
            let opName = "";
            switch (node.op) {
                case "*":
                    opName = "multiply";
                    break;
                case "/":
                    opName = "divide";
                    break;
                case "+":
                    opName = "add";
                    break;
                case "-":
                    opName = "subtract";
                    break;
            }
            usdShadeNodeName = opName + "_" + mtlxNdType;
            if (node.aNode && !node.bNode)
                inputs.push(`${getUsdType(node.aNode["nodeType___needle"])} inputs:in.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.aNode)}.outputs:out>`);
            if (node.aNode && node.bNode) {
                const aNodeType = getUsdType(node.aNode["nodeType___needle"]);
                const bNodeType = getUsdType(node.bNode["nodeType___needle"]);
                // todo: make this more generic / support all combinations
                if (aNodeType === 'color3f' && bNodeType === 'float' || bNodeType === 'float' && bNodeType === 'color3f') {
                    usdShadeNodeName = opName + "_color3FA";
                }
                inputs.push(`${aNodeType} inputs:in1.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.aNode)}.outputs:out>`);
                inputs.push(`${bNodeType} inputs:in2.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.bNode)}.outputs:out>`);
            }
            break;
        case "TextureNode":
            if (node.uvNode) {
                usdShadeNodeName = "tiledimage_" + mtlxNdType;
                inputs.push(`float2 inputs:texcoord.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.uvNode)}.outputs:out>`);
            }
            else {
                usdShadeNodeName = "image_" + mtlxNdType;
            }
            const texture = node._value;
            const isRGBA = formatsWithAlphaChannel.includes(texture.format);
            const textureName = texName(texture);
            inputs.push(`asset inputs:file = @textures/${textureName}.${isRGBA ? 'png' : 'jpg'}@`);
            textures[textureName] = { texture, scale: undefined };
            break;
        case "NormalMapNode":
            usdNdType = "float3";
            usdShadeNodeName = "normalmap";
            inputs.push(`${usdNdType} inputs:in.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.node)}.outputs:out>`);
            break;
        case "AttributeNode":
            usdShadeNodeName = "geompropvalue_" + mtlxNdType;
            inputs.push(`string inputs:geomprop = "st"`);
            break;
        case "ShaderCallNodeInternal":
            usdShadeNodeName = node["shaderNodeLayoutName___needle"] + "_" + mtlxNdType;
            inputs.push(`${usdNdType} inputs:in.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.inputNodes[0])}.outputs:out>`);
            break;
        case "SplitNode":
            usdShadeNodeName = "swizzle_" + getType(node.node["nodeType___needle"]) + "_" + mtlxNdType;
            inputs.push(`${getUsdType(node.node["nodeType___needle"])} inputs:in.connect = ${materialRoot}/${materialName}/${getUniqueNodeName(node.node)}.outputs:out>`);
            inputs.push(`string inputs:channels = "${node.components}"`);
            break;
    }
    // todo: better way to pad here for sure...
    return `
	${pad}def Shader "${getUniqueNodeName(node)}"
	${pad}{
		${pad}uniform token info:id = "ND_${usdShadeNodeName}"
		${pad}${usdNdType} outputs:out
		${pad}${inputs.length > 0 ? inputs.join("\n				") : ""}
	${pad}}
	`;
}
function getShadersFromNodes(nodes, materialName, textures, getUniqueNodeName) {
    let shaderOutput = "";
    for (const node of nodes) {
        shaderOutput += TSLNodeToUsdShadeString(node, materialName, getUniqueNodeName, textures);
    }
    return shaderOutput;
}
function texName(tex) {
    // If we have a source, we only want to use the source's id, not the texture's id
    // to avoid exporting the same underlying data multiple times.
    return makeNameSafeForUSD(tex.name) + '_' + (tex.source?.id ?? tex.id);
}
export { buildNodeMaterial };
//# sourceMappingURL=NodeMaterialConverter.js.map