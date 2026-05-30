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
import { AppIcon } from '../../components/primitives/AppIcon';
import { ConfidenceMeter } from '../../components/primitives/ConfidenceMeter';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';

export default function NewCall() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [subject, setSubject] = useState('');
  const [detail, setDetail] = useState('');
  const [confidence, setConfidence] = useState(5);

  const canPost = subject.trim().length > 0;

  const onPost = () => {
    if (!canPost) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO(supabase): replace with createCall({ subject, detail, confidence, target_date }) mutation.
    Alert.alert('TODO', 'Wire to Supabase');
  };

  const onCancel = () => {
    Haptics.selectionAsync();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <Stack.Screen options={{ title: 'Make a Call' }} />

      {/* Custom header — back chevron + title.
          Stack header is hidden globally via root _layout, so each modal owns chrome. */}
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
          Make a Call
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
          {/* Subject */}
          <View>
            <MicroLabel>SUBJECT</MicroLabel>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="What are you calling?"
              placeholderTextColor={colors.ash}
              multiline={false}
              style={{
                fontFamily: fonts.semibold,
                fontSize: 22,
                lineHeight: 28,
                letterSpacing: -0.2,
                color: colors.ink,
                paddingVertical: space[3],
                marginTop: space[2],
              }}
            />
            <HairlineRule />
          </View>

          {/* Detail */}
          <View style={{ marginTop: space[5] }}>
            <MicroLabel>WHY (OPTIONAL)</MicroLabel>
            <TextInput
              value={detail}
              onChangeText={setDetail}
              placeholder="Add your reasoning…"
              placeholderTextColor={colors.ash}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={{
                fontFamily: fonts.medium,
                fontSize: 17,
                lineHeight: 24,
                color: colors.ink,
                paddingVertical: space[3],
                marginTop: space[2],
                minHeight: 120,
              }}
            />
            <HairlineRule />
          </View>

          {/* Confidence */}
          <View style={{ marginTop: space[5] }}>
            <MicroLabel>CONFIDENCE</MicroLabel>
            <View style={{ marginTop: space[3] }}>
              <ConfidenceMeter
                value={confidence}
                onChange={setConfidence}
                editable
                size="lg"
              />
            </View>
            <Txt variant="bodySm" tone="ash" style={{ marginTop: space[3] }}>
              How sure are you, 1 (just a hunch) to 10 (lock it in)?
            </Txt>
          </View>

          {/* Target date — stub */}
          <View style={{ marginTop: space[5] }}>
            <MicroLabel>DECIDE BY</MicroLabel>
            {/* TODO(supabase): wire date picker — store target_date on the call row. */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                Alert.alert('TODO', 'Wire date picker');
              }}
              accessibilityRole="button"
              accessibilityLabel="Pick a target date"
              style={({ pressed }) => ({
                marginTop: space[2],
                paddingVertical: space[4],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Txt variant="bodyLg" tone="ash">
                Decide by …
              </Txt>
              <AppIcon name="ChevronRight" size={20} tone="ash" />
            </Pressable>
            <HairlineRule />
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
          <PrimaryButton label="POST CALL" full onPress={onPost} disabled={!canPost} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
