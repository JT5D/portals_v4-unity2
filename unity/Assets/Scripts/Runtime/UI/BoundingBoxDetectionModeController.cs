using TMPro;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using UnityEngine.XR.ARSubsystems;
#if ANDROIDOPENXR_1_0_0_3_OR_NEWER && UNITY_ANDROID
using UnityEngine.XR.OpenXR.Features.Android;
#endif // ANDROIDOPENXR_1_0_0_3_OR_NEWER && UNITY_ANDROID

namespace UnityEngine.XR.ARFoundation.Samples
{
    public class BoundingBoxDetectionModeController : MonoBehaviour
    {
        [Tooltip("The UI Text element used to display the state of the Plane Detection Mode flags.")]
        [SerializeField]
        TextMeshProUGUI m_FlagsText;

        [SerializeField]
        [Tooltip("The active AR Bounding Box Manager in the scene.")]
        ARBoundingBoxManager m_BoundingBoxManager;

        [Tooltip("The SliderToggle element used to control the on/off state of laptop bounding box detection.")]
        [SerializeField]
        SliderToggle m_LaptopSliderToggle;

        [SerializeField]
        GameObject m_LaptopToggleObject;

        [Tooltip("The SliderToggle element used to control the on/off state of mouse bounding box detection.")]
        [SerializeField]
        SliderToggle m_MouseSliderToggle;

        [SerializeField]
        GameObject m_MouseToggleObject;

        [Tooltip("The SliderToggle element used to control the on/off state of keyboard bounding box detection.")]
        [SerializeField]
        SliderToggle m_KeyboardSliderToggle;

        [SerializeField]
        GameObject m_KeyboardToggleObject;

        BoundingBoxClassifications m_DetectionMode;

        void Reset()
        {
            m_BoundingBoxManager = FindAnyObjectByType<ARBoundingBoxManager>();
        }

        void Start()
        {
#if ANDROIDOPENXR_1_0_0_3_OR_NEWER && UNITY_ANDROID
            if (m_BoundingBoxManager.subsystem is AndroidOpenXRBoundingBoxSubsystem)
            {
                var subsystem = m_BoundingBoxManager.subsystem as AndroidOpenXRBoundingBoxSubsystem;
                m_DetectionMode = subsystem.GetBoundingBoxDetectionMode();
                m_FlagsText.text = "Flags: " + m_DetectionMode;
            }
            else
            {
                m_FlagsText.text = "";
            }
#else
            m_FlagsText.text = "";
#endif // ANDROIDOPENXR_1_0_0_3_OR_NEWER && UNITY_ANDROID

            InitializeSliderWithDetectionMode(m_LaptopSliderToggle, m_LaptopToggleObject, BoundingBoxClassifications.Laptop);
            InitializeSliderWithDetectionMode(m_MouseSliderToggle, m_MouseToggleObject, BoundingBoxClassifications.Mouse);
            InitializeSliderWithDetectionMode(m_KeyboardSliderToggle, m_KeyboardToggleObject, BoundingBoxClassifications.Keyboard);
        }

        public void ToggleLaptopBoundingBoxes()
        {
            XRResultStatus resultStatus = ToggleBoundingBoxesOfType(BoundingBoxClassifications.Laptop);
            m_LaptopSliderToggle.SetSliderValue((m_DetectionMode & BoundingBoxClassifications.Laptop) == BoundingBoxClassifications.Laptop);
            if (resultStatus.IsError())
            {
                Debug.LogError("Failed to toggle laptop bounding boxes.", this);
            }
        }

        public void ToggleMouseBoundingBoxes()
        {
            XRResultStatus resultStatus = ToggleBoundingBoxesOfType(BoundingBoxClassifications.Mouse);
            m_MouseSliderToggle.SetSliderValue((m_DetectionMode & BoundingBoxClassifications.Mouse) == BoundingBoxClassifications.Mouse);
            if (resultStatus.IsError())
            {
                Debug.LogError("Failed to toggle mouse bounding boxes.", this);
            }
        }

        public void ToggleKeyboardBoundingBoxes()
        {
            XRResultStatus resultStatus = ToggleBoundingBoxesOfType(BoundingBoxClassifications.Keyboard);
            m_KeyboardSliderToggle.SetSliderValue((m_DetectionMode & BoundingBoxClassifications.Keyboard) == BoundingBoxClassifications.Keyboard);
            if (resultStatus.IsError())
            {
                Debug.LogError("Failed to toggle keyboard bounding boxes.", this);
            }
        }

        public XRResultStatus ToggleBoundingBoxesOfType(BoundingBoxClassifications classificationsToToggle)
        {
            XRResultStatus resultStatus = new XRResultStatus(XRResultStatus.StatusCode.UnqualifiedSuccess);
#if ANDROIDOPENXR_1_0_0_3_OR_NEWER && UNITY_ANDROID
            if (m_BoundingBoxManager.subsystem is AndroidOpenXRBoundingBoxSubsystem)
            {
                var subsystem = m_BoundingBoxManager.subsystem as AndroidOpenXRBoundingBoxSubsystem;
                BoundingBoxClassifications detectionMode = m_DetectionMode;

                // XOR toggles flag enums
                detectionMode ^= classificationsToToggle;

                resultStatus = subsystem.TrySetBoundingBoxDetectionMode(detectionMode);
                m_DetectionMode = subsystem.GetBoundingBoxDetectionMode();
            }
#endif // ANDROIDOPENXR_1_0_0_3_OR_NEWER && UNITY_ANDROID
            return resultStatus;
        }

        public void InitializeSliderWithDetectionMode(SliderToggle slider, GameObject sliderObject, BoundingBoxClassifications classification)
        {
#if ANDROIDOPENXR_1_0_0_3_OR_NEWER && UNITY_ANDROID
            if ((m_BoundingBoxManager.subsystem is AndroidOpenXRBoundingBoxSubsystem) && slider != null && sliderObject != null)
            {
                sliderObject.SetActive(true);
                slider.SetSliderValue((m_DetectionMode & BoundingBoxClassifications.Laptop) == BoundingBoxClassifications.Laptop);
            }
            if ((m_BoundingBoxManager.subsystem is not AndroidOpenXRBoundingBoxSubsystem) && sliderObject != null)
            {
                sliderObject.SetActive(false);
            }
#else
            if (sliderObject != null)
            {
                sliderObject.SetActive(false);
            }
#endif // ANDROIDOPENXR_1_0_0_3_OR_NEWER && UNITY_ANDROID
        }
    }
}
