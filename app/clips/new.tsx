import { useState } from 'react';
import {
  View,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '../../components/primitives/Text';
import { AppIcon } from '../../components/primitives/AppIcon';
// NOTE: clips screens are dark-by-default regardless of theme preference. See
// /(tabs)/clips.tsx for the rationale.
import { darkColors } from '../../theme/colors';
import { space, type, fonts } from '../../theme';

// TODO(supabase + expo-camera): wire camera capture and clip upload.
// - "Record" → expo-camera (recordAsync) → upload to /clips/{user}/{uuid}.mp4
// - "Choose from library" → expo-image-picker (mediaTypes: Videos)
// - "Next" → submit caption + uploaded video URL to a clips insert mutation.
export default function NewClip() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');

  const handleNext = () => {
    if (!caption.trim()) {
      Alert.alert('Add a caption', 'Clips without a caption tank.');
      return;
    }
    Alert.alert('TODO', 'Wire to clips insert mutation + uploader.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: darkColors.paper }}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + space[2] },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={styles.headerIcon}
        >
          <AppIcon name="X" size={26} tone="paper" />
        </Pressable>
        <Txt
          variant="bodyLg"
          weight="bold"
          style={{ color: darkColors.ink }}
        >
          Add Clip
        </Txt>
        <Pressable
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel="Next"
          hitSlop={8}
          style={styles.nextBtn}
        >
          <Txt
            variant="bodyLg"
            weight="bold"
            style={{ color: darkColors.ember }}
          >
            Next
          </Txt>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space[5],
          paddingTop: space[6],
          paddingBottom: insets.bottom + space[6],
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Big capture card */}
        <Pressable
          onPress={() =>
            Alert.alert('TODO', 'Wire to camera (expo-camera recordAsync).')
          }
          accessibilityRole="button"
          accessibilityLabel="Record a clip"
          style={styles.captureCard}
        >
          <View style={styles.captureIconWrap}>
            <AppIcon name="Video" size={48} tone="paper" />
          </View>
          <Txt
            variant="display4"
            style={{
              color: darkColors.ink,
              marginTop: space[4],
              textAlign: 'center',
            }}
          >
            Record
          </Txt>
          <Txt
            variant="bodySm"
            style={{
              color: darkColors.ash,
              marginTop: space[1],
              textAlign: 'center',
            }}
          >
            Hold for video. Max 60s.
          </Txt>
        </Pressable>

        {/* Library link */}
        <Pressable
          onPress={() =>
            Alert.alert(
              'TODO',
              'Wire to image picker (expo-image-picker, Videos).'
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Choose from library"
          style={styles.libraryRow}
        >
          <AppIcon name="Camera" size={20} tone="paper" />
          <Txt
            variant="bodyLg"
            weight="semibold"
            style={{ color: darkColors.ink }}
          >
            Choose from library
          </Txt>
        </Pressable>

        {/* Caption */}
        <View style={{ marginTop: space[7] }}>
          <Txt
            variant="micro"
            style={{ color: darkColors.ash, marginBottom: space[2] }}
          >
            Caption
          </Txt>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption…"
            placeholderTextColor={darkColors.ash}
            multiline
            numberOfLines={6}
            maxLength={280}
            allowFontScaling={false}
            style={[
              styles.captionInput,
              {
                backgroundColor: darkColors.surface,
                color: darkColors.ink,
                borderColor: darkColors.fog,
                // Pull the input typography from the theme so it matches Txt
                // variant="bodyLg". Native TextInputs can't render Txt directly.
                fontFamily: fonts.medium,
                fontSize: type.bodyLg.fontSize,
                lineHeight: type.bodyLg.lineHeight,
              },
            ]}
            textAlignVertical="top"
          />
          <Txt
            variant="bodySm"
            style={{
              color: darkColors.ash,
              marginTop: space[2],
              textAlign: 'right',
            }}
          >
            {caption.length} / 280
          </Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    minWidth: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  captureCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkColors.fog,
    backgroundColor: darkColors.surface,
    paddingVertical: space[8],
    paddingHorizontal: space[5],
    alignItems: 'center',
  },
  captureIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: darkColors.fog,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkColors.paper,
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    justifyContent: 'center',
    paddingVertical: space[4],
  },
  captionInput: {
    minHeight: 132,
    borderRadius: 12,
    borderWidth: 1,
    padding: space[4],
  },
});
