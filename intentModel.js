var loadIntentModel = (() => {
  // Private variable to hold the session, implementing the singleton pattern.
  let session = null;

  /**
   * Asynchronously loads and returns the ONNX inference session.
   * If the model is already loaded, it returns the cached session.
   * @returns {Promise<ort.InferenceSession|null>} A promise that resolves to the
   * session, or null if loading fails.
   */
  return async () => {
    // If the session is already loaded, return it from the cache.
    if (session) {
      return session;
    }

    try {
      // Get the full, browser-accessible URL of the model file packed within the extension.
      const modelURL = chrome.runtime.getURL('model/intent_model.onnx');

      // Create the ONNX inference session.
      // The 'ort' object is assumed to be available globally, loaded from a CDN.
      const newSession = await ort.InferenceSession.create(modelURL);

      // Cache the newly created session in the private 'session' variable.
      session = newSession;
      
      return session;
    } catch (e) {
      // Log any errors that occur during model loading.
      console.error(`Failed to load the ONNX model: ${e}`);
      // Return null to allow the caller to handle the failure gracefully.
      return null;
    }
  };
})();
