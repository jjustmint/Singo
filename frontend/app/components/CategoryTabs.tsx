import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';

const categories = ['New Release', 'Trending','All Songs'];

interface CategoryTabsProps {
  scrollToSection: (category: string) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ scrollToSection }) => {
  const [selected, setSelected] = useState('New Release');

  return (
    <View style={{ marginVertical: 10, paddingHorizontal: 20 }}>
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          const isSelected = item === selected;
          return (
            <TouchableOpacity
              onPress={() => {
                setSelected(item);
                scrollToSection(item); // Call the scrollToSection function
              }}
              style={{
                backgroundColor: isSelected ? '#6C63FF' : '#333',
                borderRadius: 20,
                paddingVertical: 12,
                paddingHorizontal: 16,
                marginRight: 10,
                minWidth: 80,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: isSelected ? '#fff' : '#ccc',
                  fontWeight: isSelected ? '600' : '500',
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

export default CategoryTabs;

