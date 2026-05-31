import { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { Card } from '../../components/primitives/Card';
import { AppIcon } from '../../components/primitives/AppIcon';
import { useTheme, space, radius, SCREEN_PADDING, type, fonts } from '../../theme';

const MAX_LEN = 500;

export default function NewTake() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [body, setBody] = useState('');

  const trimmed = body.trim();
  const canPost = trimmed.length > 0 && trimmed.length <= MAX_LEN;
  const overLimit = body.length > MAX_LEN;

  const onPost = () => {
    if (!canPost) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO(supabase): replace with createTake({ body, media_url? }) mutation.
    Alert.alert('TODO', 'Wire to Supabase');
  };

  const onCancel = () => {
    Haptics.selectionAsync();
    router.back();
  };

  const onAttachPhoto = () => {
    Haptics.selectionAsync();
    // TODO(supabase): wire expo-image-picker + upload to Supabase storage.
    Alert.alert('TODO', 'Wire media picker');
  };

  const counterColor = overLimit ? colors.ember : colors.ash;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Stack.Screen options={{ title: 'Post a Take' }} />

      {/* Custom header */}
      <View
        style={{
          paddingTop: insets.top + space[2],
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: space[3],
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[3],
        }}
      >
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={12}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -space[1] }}
        >
          <AppIcon name="ChevronLeft" size={28} tone="ink" />
        </Pressable>
        <Txt variant="display4" weight="bold" style={{ flex: 1 }}>
          Post a Take
        </Txt>
      </View>
      <HairlineRule />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[5],
            paddingBottom: space[8] + 64,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Body */}
          <View>
            <MicroLabel>YOUR TAKE</MicroLabel>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="What's the take?"
              placeholderTextColor={colors.ash}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              autoFocus
              style={[
                type.bodyLg,
                {
                  fontFamily: fonts.medium,
                  color: colors.ink,
                  paddingVertical: space[3],
                  marginTop: space[2],
                  minHeight: 220,
                },
              ]}
            />
            <HairlineRule />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: space[2],
              }}
            >
              <Txt variant="micro" style={{ color: counterColor }}>
                {body.length} / {MAX_LEN}
              </Txt>
            </View>
          </View>

          {/* Optional media slot */}
          <View style={{ marginTop: space[5] }}>
            <MicroLabel>ATTACH (OPTIONAL)</MicroLabel>
            {/* TODO(supabase): swap stubbed Pressable for an image-picker flow + Supabase storage. */}
            <Card pressable onPress={onAttachPhoto} style={{ marginTop: space[3], padding: space[5] }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[3],
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.full,
                    backgroundColor: colors.fog,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppIcon name="Camera" size={22} tone="ink" />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyLg" weight="semibold">
                    Attach photo
                  </Txt>
                  <Txt variant="bodySm" tone="ash" style={{ marginTop: 2 }}>
                    A picture is worth a thousand reposts.
                  </Txt>
                </View>
                <AppIcon name="ChevronRight" size={20} tone="ash" />
              </View>
            </Card>
          </View>
        </ScrollView>

        {/* Sticky bottom CTA */}
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[3],
            paddingBottom: insets.bottom > 0 ? insets.bottom : space[4],
            borderTopWidth: 1,
            borderTopColor: colors.fog,
            backgroundColor: colors.paper,
          }}
        >
          <PrimaryButton label="POST TAKE" full onPress={onPost} disabled={!canPost} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
