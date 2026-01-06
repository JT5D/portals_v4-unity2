

/*
DO NOT IMPORT ENGINE_ELEMENT FROM HERE
*/

/**
 * Call with the name of an attribute that you want to receive change events for    
 * This is useful for example if you want to add custom attributes to <needle-engine> 
 * Use the addAttributeChangeCallback utility methods to register callback events
 */
export async function registerObservableAttribute(name: string) {
    const { NeedleEngineWebComponent } = await import("./needle-engine.js");
    if (!NeedleEngineWebComponent.observedAttributes.includes(name))
        NeedleEngineWebComponent.observedAttributes.push(name);
}
