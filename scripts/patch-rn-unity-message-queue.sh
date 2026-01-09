#!/bin/bash
# Patch react-native-unity to add message queue for Fabric event emitter timing
# This fixes the issue where Unity sends messages before Fabric's _eventEmitter is ready

set -e

RNUNITY_MM="node_modules/@artmajeur/react-native-unity/ios/RNUnityView.mm"

if [ ! -f "$RNUNITY_MM" ]; then
    echo "[SKIP] RNUnityView.mm not found"
    exit 0
fi

# Check if already patched
if grep -q "_pendingMessages" "$RNUNITY_MM"; then
    echo "[SKIP] RNUnityView.mm already has message queue patch"
    exit 0
fi

echo "[PATCH] Adding message queue to RNUnityView.mm..."

# Create backup
cp "$RNUNITY_MM" "${RNUNITY_MM}.bak"

# Apply patches using sed

# 1. Add instance variable for pending messages
sed -i '' 's/@implementation RNUnityView/@implementation RNUnityView {\n    NSMutableArray<NSDictionary*> *_pendingMessages;  \/\/ Buffer for messages before eventEmitter ready\n}/' "$RNUNITY_MM"

# 2. Initialize pending messages in initWithFrame
sed -i '' 's/_props = defaultProps;/_props = defaultProps;\n    _pendingMessages = [NSMutableArray new];/' "$RNUNITY_MM"

# 3. Add logging and buffering in the onUnityMessage lambda
# This is a complex multi-line replacement, so we use a different approach
cat > /tmp/rn_unity_patch.txt << 'PATCH_EOF'
    self.onUnityMessage = [self](NSDictionary* data) {
      if (_eventEmitter != nil) {
        NSLog(@"[RNUnity] onUnityMessage lambda: _eventEmitter is READY, sending to JS");
        auto gridViewEventEmitter = std::static_pointer_cast<RNUnityViewEventEmitter const>(_eventEmitter);
        facebook::react::RNUnityViewEventEmitter::OnUnityMessage event = {
          .message=[[data valueForKey:@"message"] UTF8String]
        };
        gridViewEventEmitter->onUnityMessage(event);
      } else {
        NSLog(@"[RNUnity] onUnityMessage lambda: _eventEmitter is NIL, buffering message (queue size: %lu)", (unsigned long)_pendingMessages.count + 1);
        [_pendingMessages addObject:data];
      }
    };
PATCH_EOF

# 4. Update updateEventEmitter to flush pending messages
# Find and replace the updateEventEmitter method
python3 << 'PYTHON_EOF'
import re

with open('node_modules/@artmajeur/react-native-unity/ios/RNUnityView.mm', 'r') as f:
    content = f.read()

# Replace the simple updateEventEmitter with the version that flushes pending messages
old_method = r'- \(void\)updateEventEmitter:\(EventEmitter::Shared const &\)eventEmitter \{\s*\[super updateEventEmitter:eventEmitter\];\s*\}'

new_method = '''- (void)updateEventEmitter:(EventEmitter::Shared const &)eventEmitter {
    NSLog(@"[RNUnity] updateEventEmitter CALLED, pending messages: %lu", (unsigned long)_pendingMessages.count);
    [super updateEventEmitter:eventEmitter];

    // Flush pending messages now that eventEmitter is ready
    if (_pendingMessages.count > 0 && _eventEmitter != nil) {
        NSLog(@"[RNUnity] Flushing %lu pending messages", (unsigned long)_pendingMessages.count);
        for (NSDictionary* data in _pendingMessages) {
            auto gridViewEventEmitter = std::static_pointer_cast<RNUnityViewEventEmitter const>(_eventEmitter);
            facebook::react::RNUnityViewEventEmitter::OnUnityMessage event = {
                .message=[[data valueForKey:@"message"] UTF8String]
            };
            NSLog(@"[RNUnity] Flushing message: %@", [data valueForKey:@"message"]);
            gridViewEventEmitter->onUnityMessage(event);
        }
        [_pendingMessages removeAllObjects];
        NSLog(@"[RNUnity] Pending messages flushed");
    }
}'''

content = re.sub(old_method, new_method, content, flags=re.DOTALL)

with open('node_modules/@artmajeur/react-native-unity/ios/RNUnityView.mm', 'w') as f:
    f.write(content)

print("[PATCH] updateEventEmitter method updated")
PYTHON_EOF

echo "[DONE] Message queue patch applied to RNUnityView.mm"
