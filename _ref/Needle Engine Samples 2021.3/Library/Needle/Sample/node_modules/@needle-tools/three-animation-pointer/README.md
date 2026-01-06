# KHR_animation_pointer for three.js

This package adds a [three.js](https://github.com/mrdoob/three.js) GLTFLoader plugin for [KHR_animation_pointer](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_animation_pointer) support allowing you to animate anything in your 3D scene, from material, light or camera properties to custom code.

### Animate anything
- all material properties 💎 (including texture transforms) 
- cameras 🎥
- lights 💡
- custom code/scripts 📄


### Three.js Example
<a href="https://threejs.org/examples/?q=gltf#webgl_loader_gltf_animation_pointer" target="_blank">
<img width="1240" height="696" alt="image" src="https://github.com/user-attachments/assets/baa109d8-974b-4c97-9ae9-31a4391e651b" />
</a>

[Video](https://github.com/user-attachments/assets/13fe4102-00ee-430f-9a17-9611fa543f77)

[three.js Example](https://threejs.org/examples/?q=gltf#webgl_loader_gltf_animation_pointer)



### How to use

Install the package:   
`npm i @needle-tools/three-animation-pointer`


Register the plugin on your GLTFLoader:  

```js
import { GLTFAnimationPointerExtension } from "@needle-tools/three-animation-pointer"

const loader = new GLTFLoader();
loader.register(p => {
    return new GLTFAnimationPointerExtension(p);
});
```

*Note: To animate custom code you might need to register your own path resolver in the GLTFAnimationPointerExtension plugin* 

### How to create glTF files with KHR_animation_pointer animations

You can use one of the listed tools below to export glTF animations in the right format

- [Blender 4.3](https://www.blender.org/) and newer - *experimental KHR_animation_pointer support, currently only in 'scene animation' mode ([#2285](https://github.com/KhronosGroup/glTF-Blender-IO/issues/2285))*
- [Needle Engine for Unity](https://engine.needle.tools/docs/unity/) - using KHR_animation_pointer by default in all projects since 2022
- [UnityGLTF](https://github.com/KhronosGroup/UnityGLTF) - enable KHR_animation_pointer in settings to use in Exports


**Mini Unity Tutorial**

[Video](https://github.com/user-attachments/assets/e118a33d-9725-4313-b1d4-b4dbfc7a5a48)

*Note: If you use UnityGLTF for exporting the glTF file make sure to enable the `KHR_animation_pointer` option in the UnityGLTF export settings.*



## Links

- [Khronos KHR_animation_pointer spec](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_animation_pointer)
- [three.js repository PR #24108](https://github.com/mrdoob/three.js/pull/24108)
- [three.js example](https://threejs.org/examples/?q=gltf#webgl_loader_gltf_animation_pointer) - created in Unity



# Contact ✒️
<b>[🌵 Needle](https://needle.tools)</b> • 
[Github](https://github.com/needle-tools) • 
[Twitter](https://twitter.com/NeedleTools) • 
[Discord](https://discord.needle.tools) • 
[Forum](https://forum.needle.tools) • 
[Youtube](https://www.youtube.com/@needle-tools)
