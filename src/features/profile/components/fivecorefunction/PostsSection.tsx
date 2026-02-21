import React from "react";
import { View, Image, TouchableOpacity } from "react-native";

type PostItem = { id: number; image: string };

export default function PostsSection({
  posts,
  styles,
}: {
  posts: PostItem[];
  styles: any;
}) {
  return (
    <View style={styles.postsGrid}>
      {posts.map((item) => (
        <TouchableOpacity key={item.id} style={styles.gridImageContainer}>
          <Image source={{ uri: item.image }} style={styles.gridImage} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
