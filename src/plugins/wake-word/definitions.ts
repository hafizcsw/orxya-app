export interface WakeWordPlugin {
  /**
   * Start listening for wake word
   */
  startListening(options: {
    accessKey: string;
    builtInKeyword?: 'BUMBLEBEE' | 'PORCUPINE' | 'PICOVOICE' | 'JARVIS' | 'ALEXA';
    customKeywordPath?: string;
    sensitivity?: number; // 0.0 - 1.0
    enableBackground?: boolean;
  }): Promise<{ success: boolean }>;
  
  /**
   * Stop listening for wake word
   */
  stopListening(): Promise<void>;
  
  /**
   * Add listener for wake word detection
   */
  addListener(
    eventName: 'wakeWordDetected',
    listenerFunc: (info: { keyword: string }) => void
  ): Promise<any>;
  
  /**
   * Remove all listeners
   */
  removeAllListeners(): Promise<void>;
}
