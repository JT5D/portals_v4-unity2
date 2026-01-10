using UnityEngine;
using UnityEngine.XR.ARFoundation;

namespace Portals.AR
{
    /// <summary>
    /// Wrapper that prevents NullReferenceException in AROcclusionManager.DestroyTextures()
    /// when OnDisable is called before OnAfterStart (subsystem never initialized).
    ///
    /// AR Foundation 6.3.2 bug: m_SwapchainStrategy.Dispose() is called without null check.
    ///
    /// SETUP: Disable AROcclusionManager in the Inspector. This script will enable it
    /// only after ARSession reaches SessionTracking state (when subsystem is initialized).
    /// </summary>
    [DefaultExecutionOrder(-100)] // Run before AROcclusionManager
    public class SafeAROcclusionManager : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("The AROcclusionManager to control. Must be DISABLED in Inspector.")]
        AROcclusionManager m_OcclusionManager;

        bool m_HasEnabledOcclusion;

        void Awake()
        {
            if (m_OcclusionManager == null)
                m_OcclusionManager = GetComponentInChildren<AROcclusionManager>(includeInactive: true);

            if (m_OcclusionManager == null)
            {
                Debug.LogError("[SafeAROcclusionManager] No AROcclusionManager found!");
                enabled = false;
                return;
            }

            // Warn if occlusion manager is already enabled - it should be disabled in Inspector
            if (m_OcclusionManager.enabled)
            {
                Debug.LogWarning("[SafeAROcclusionManager] AROcclusionManager should be DISABLED in Inspector. " +
                    "This script will enable it when safe. Proceeding anyway but crash may occur.");
            }
        }

        void OnEnable()
        {
            ARSession.stateChanged += OnARSessionStateChanged;

            // Check if session is already tracking
            if (ARSession.state >= ARSessionState.SessionTracking)
            {
                EnableOcclusionManagerSafely();
            }
        }

        void OnDisable()
        {
            ARSession.stateChanged -= OnARSessionStateChanged;
        }

        void OnARSessionStateChanged(ARSessionStateChangedEventArgs args)
        {
            if (args.state >= ARSessionState.SessionTracking)
            {
                EnableOcclusionManagerSafely();
            }
        }

        void EnableOcclusionManagerSafely()
        {
            if (m_OcclusionManager != null && !m_HasEnabledOcclusion)
            {
                m_HasEnabledOcclusion = true;
                m_OcclusionManager.enabled = true;
                Debug.Log("[SafeAROcclusionManager] Enabled AROcclusionManager - AR session is tracking");
            }
        }
    }
}
