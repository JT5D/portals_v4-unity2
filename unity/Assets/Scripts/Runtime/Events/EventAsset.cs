using System;
// We keep Visual Scripting in the manifest but avoid hard dependencies so plain C# scenes compile
// even if VS isn’t imported yet.

namespace UnityEngine.XR.ARFoundation.Samples
{
    [CreateAssetMenu(menuName = "XR/AR Foundation/Events/EventAsset")]
    public class EventAsset : ScriptableObject
    {
        public event EventHandler eventRaised;

        public void Raise()
        {
            eventRaised?.Invoke(this, EventArgs.Empty);
        }
    }

    /// <summary>
    /// Serializable base class for an Observer pattern implementation that can be composed via the Inspector.
    /// </summary>
    /// <typeparam name="T">The event argument type.</typeparam>
    public abstract class EventAsset<T> : ScriptableObject
    {
        /// <summary>
        /// Invoked by <see cref="Raise"/>.
        /// </summary>
        public event EventHandler<T> eventRaised;

        /// <summary>
        /// Raises the event.
        /// </summary>
        /// <param name="arg">The event argument.</param>
        public void Raise(T arg)
        {
            eventRaised?.Invoke(this, arg);
        }
    }
}
