import { useRef, useState } from 'react';
import { View, useWindowDimensions, FlatList } from 'react-native';
import { ClipPlayer } from '../../components/composite/ClipPlayer';
import { clips } from '../../data/fixtures/clips';
import { useTheme } from '../../theme';

export default function WatchScreen() {
  const { height } = useWindowDimensions();
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.void }}>
      <FlatList
        ref={flatListRef}
        data={clips}
        keyExtractor={(c) => c.id}
        renderItem={({ item, index }) => (
          <ClipPlayer clip={item} active={index === activeIndex} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setActiveIndex(viewableItems[0].index);
          }
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
      />
    </View>
  );
}
