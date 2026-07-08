import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

const { width, height } = Dimensions.get("window");

const VIDEO_URL =
  "https://af9e-88-164-101-212.ngrok-free.app/uploads/media/92117994-4da9-4d28-9a11-28b30b3913a6/932701fc-495c-44be-ad6c-1810677a2753/1780132434557_wsoqwlzc0de.mp4";

export default function TestVideo() {
  const player = useVideoPlayer(VIDEO_URL, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        allowsPictureInPicture
        fullscreenOptions={{ enable: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width,
    height: height * 0.5,
  },
});
