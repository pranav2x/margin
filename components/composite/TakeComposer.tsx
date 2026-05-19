import { useState } from 'react';
import {
  View,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { PrimaryButton } from '../primitives/PrimaryButton';
import { fonts, useTheme, space, SCREEN_PADDING } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPost: (body: string) => void;
}

const MAX_LEN = 240;

export function TakeComposer({ visible, onClose, onPost }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const remaining = MAX_LEN - text.length;
  const canPost = text.trim().length > 0;

  const submit = () => {
    if (!canPost) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPost(text.trim());
    setText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <View
          style={{
            height: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: SCREEN_PADDING,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={22} color={colors.ink} strokeWidth={1.25} />
          </Pressable>
          <MicroLabel>NEW TAKE</MicroLabel>
          <View style={{ width: 22 }} />
        </View>
        <HairlineRule />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, paddingHorizontal: SCREEN_PADDING, paddingTop: space[5] }}>
            <Txt
              variant="display3"
              italic
              tone="ash"
              style={{
                fontFamily: 'InstrumentSerifItalic',
                fontSize: 32,
                lineHeight: 36,
              }}
            >
              What’s your take?
            </Txt>
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              multiline
              maxLength={MAX_LEN}
              placeholder="Type something true."
              placeholderTextColor={colors.fog}
              style={{
                flex: 1,
                marginTop: space[5],
                fontFamily: fonts.serif,
                fontSize: 28,
                lineHeight: 36,
                color: colors.ink,
                textAlignVertical: 'top',
              }}
              cursorColor={colors.ink}
              selectionColor={colors.ash}
            />
          </View>

          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: insets.bottom + space[4] }}>
            <HairlineRule />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: space[4],
              }}
            >
              <MicroLabel tone={remaining < 20 ? 'ink' : 'ash'}>
                {remaining} CHARS LEFT
              </MicroLabel>
              <PrimaryButton
                label="POST"
                onPress={submit}
                disabled={!canPost}
                style={{ opacity: canPost ? 1 : 0.4 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
