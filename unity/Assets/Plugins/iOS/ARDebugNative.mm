// ARDebugNative.mm
// Native iOS plugin for ARDebugOverlay logging
// Provides NSLog output visible in Console.app and idevicesyslog

#import <Foundation/Foundation.h>

extern "C" {
    void NSLog_Native(const char* message) {
        if (message != NULL) {
            NSLog(@"%s", message);
        }
    }
}
