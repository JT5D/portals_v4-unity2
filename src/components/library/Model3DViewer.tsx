import React, { Suspense, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Canvas, useThree } from '@react-three/fiber/native';
import { useGLTF, Stage, OrbitControls, Center } from '@react-three/drei/native';
import { Ionicons } from '@expo/vector-icons';
import { GLView } from 'expo-gl';
import * as FileSystem from 'expo-file-system/legacy';
import { theme } from '../../theme/theme';

export interface Model3DViewerHandle {
  captureSnapshot: () => Promise<string | null>;
}

interface Model3DViewerProps {
  uri: string;
  style?: any;
  autoRotate?: boolean;
}

// Internal component to handle GL interactions
const SceneContent = forwardRef<Model3DViewerHandle, { children: React.ReactNode }>(({ children }, ref) => {
  const { gl } = useThree();

  useImperativeHandle(ref, () => ({
    captureSnapshot: async () => {
      try {
        // Wait for a frame to ensure render
        await new Promise(resolve => setTimeout(resolve, 500));

        // On native, gl.domElement might not be the direct context. 
        // We use gl.getContext() which returns the WebGLRenderingContext (with __exglCtxId).
        const glContext = gl.getContext();

        if (!glContext) {
          console.error('[Model3DViewer] Context is null');
          return null;
        }

        const result = await GLView.takeSnapshotAsync(glContext as any, {
          format: 'jpeg',
          quality: 0.8,
          result: 'file'
        } as any) as any;
        console.log('[Model3DViewer] Snapshot taken:', result);
        return (result.uri || result.localUri || null) as string | null;
      } catch (e) {
        console.error('[Model3DViewer] Snapshot failed:', e);
        return null;
      }
    }
  }));

  return <>{children}</>;
});

// Error Boundary for R3F Canvas
class ErrorBoundary extends React.Component<{ children: React.ReactNode, onError: (error: Error) => void }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Model3DViewer] 3D Error:', error);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function Model({ uri, onError }: { uri: string, onError: (e: any) => void }) {
  const [loadUri, setLoadUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    const prepareUri = async () => {
      try {
        if (uri.startsWith('file://')) {
          console.log('[Model3DViewer] Converting local file to base64...');
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });
          setLoadUri(`data:model/gltf-binary;base64,${base64}`);
        } else {
          setLoadUri(uri);
        }
      } catch (e: any) {
        console.error('[Model3DViewer] Failed to read local file:', e);
        onError(e);
      }
    };
    prepareUri();
  }, [uri]);

  if (!loadUri) return null;

  const { scene } = useGLTF(loadUri);
  return <primitive object={scene} />;
}

export const Model3DViewer = forwardRef<Model3DViewerHandle, Model3DViewerProps>(({ uri, style, autoRotate = true }, ref) => {
  const [error, setError] = React.useState<string | null>(null);

  if (error) {
    return (
      <View style={[styles.container, style, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to load model</Text>
        <Text style={styles.errorSubText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 4], fov: 50 }}
        style={{ flex: 1 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={() => console.log('[Model3DViewer] Canvas created')}
      >
        <ErrorBoundary onError={(e) => setError(e.message || String(e))}>
          <Suspense fallback={null}>
            <SceneContent ref={ref}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <Stage environment={null} intensity={1} adjustCamera>
                <Model uri={uri} onError={(e: any) => setError(e.message || 'Unknown error')} />
              </Stage>
            </SceneContent>
          </Suspense>
          <OrbitControls autoRotate={autoRotate} makeDefault />
        </ErrorBoundary>
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1E1E', // Dark grey background for model viewer
    overflow: 'hidden',
    borderRadius: 12,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: theme.colors.error,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
  },
  errorSubText: {
    color: theme.colors.textDim,
    textAlign: 'center',
    fontSize: 12,
  },
});
