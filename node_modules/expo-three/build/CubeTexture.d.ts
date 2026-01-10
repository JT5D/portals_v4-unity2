import THREE from './Three';
type AnyFunction = (...args: any[]) => any;
type AnyObject = {
    [key: string]: any;
};
type ObjectOrFunction = AnyObject | AnyFunction;
export default class CubeTexture extends THREE.CubeTexture {
    static format: {
        direct_s: string[];
        coord_s: string[];
        coord_m: string[];
    };
    loadAsync: (options: {
        assetForDirection: ObjectOrFunction;
        directions?: string[];
    }) => Promise<void>;
}
export {};
//# sourceMappingURL=CubeTexture.d.ts.map