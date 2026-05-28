declare module "@mkkellogg/gaussian-splats-3d" {
  import type { Camera } from "three";

  export const RenderMode: {
    Always: number;
    OnChange: number;
    Never: number;
  };

  export const SceneRevealMode: {
    Default: number;
    Gradual: number;
    Instant: number;
  };

  export const WebXRMode: {
    None: number;
    VR: number;
    AR: number;
  };

  export const LogLevel: {
    None: number;
    Error: number;
    Warning: number;
    Info: number;
    Debug: number;
  };

  export interface ViewerOptions {
    rootElement?: HTMLElement;
    camera?: Camera;
    cameraUp?: number[];
    initialCameraPosition?: number[];
    initialCameraLookAt?: number[];
    useBuiltInControls?: boolean;
    sharedMemoryForWorkers?: boolean;
    gpuAcceleratedSort?: boolean;
    dynamicScene?: boolean;
    renderMode?: number;
    sceneRevealMode?: number;
    webXRMode?: number;
    logLevel?: number;
    ignoreDevicePixelRatio?: boolean;
    sphericalHarmonicsDegree?: number;
  }

  export interface SplatSceneOptions {
    splatAlphaRemovalThreshold?: number;
    showLoadingUI?: boolean;
    position?: number[];
    rotation?: number[];
    scale?: number[];
    progressiveLoad?: boolean;
    onProgress?: (
      percentComplete: number,
      percentCompleteLabel?: string,
      loaderStatus?: number
    ) => void;
  }

  export class Viewer {
    camera?: {
      position: {
        set(x: number, y: number, z: number): void;
      };
      lookAt(x: number, y: number, z: number): void;
      updateProjectionMatrix?: () => void;
    };
    constructor(options?: ViewerOptions);
    addSplatScene(path: string, options?: SplatSceneOptions): Promise<void>;
    start(): void;
    update(): void;
    render(): void;
    forceRenderNextFrame(): void;
    dispose(): Promise<void> | void;
  }

  export class PlyLoader {
    static loadFromFileData(
      plyFileData: ArrayBuffer,
      minimumAlpha?: number,
      compressionLevel?: number,
      optimizeSplatData?: boolean,
      outSphericalHarmonicsDegree?: number,
      sectionSize?: number,
      sceneCenter?: unknown,
      blockSize?: number,
      bucketSize?: number
    ): Promise<{ bufferData: ArrayBuffer }>;
  }
}
