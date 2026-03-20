import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PostActionSheetProps {
  visible: boolean;
  onClose: () => void;
  isOwn: boolean;
  onDelete: () => void;
  onReport: () => void;
  onEdit?: () => void;
}

export default function PostActionSheet({
  visible,
  onClose,
  isOwn,
  onDelete,
  onReport,
  onEdit,
}: PostActionSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [showModal, setShowModal] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    } else if (showModal) {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setShowModal(false));
    }
  }, [visible]);

  const animateClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onClose();
    });
  };

  const handleDelete = () => {
    animateClose();
    setTimeout(() => {
      Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]);
    }, 300);
  };

  const handleReport = () => {
    animateClose();
    setTimeout(() => {
      onReport();
    }, 300);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this post on ClimMate!' });
    } catch (e) {
      if (__DEV__) console.warn('Share error:', e);
    }
    animateClose();
  };

  const handleEdit = () => {
    animateClose();
    setTimeout(() => {
      onEdit?.();
    }, 300);
  };

  if (!showModal) return null;

  return (
    <Modal transparent visible={showModal} onRequestClose={animateClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={animateClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.dragBar} />

          <TouchableOpacity style={styles.row} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={20} color="#374151" />
            <Text style={styles.rowText}>Share</Text>
          </TouchableOpacity>

          {isOwn ? (
            <>
              <TouchableOpacity style={styles.row} onPress={handleEdit} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={20} color="#374151" />
                <Text style={styles.rowText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.row} onPress={handleDelete} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={[styles.rowText, { color: '#EF4444' }]}>Delete Post</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.row} onPress={handleReport} activeOpacity={0.7}>
              <Ionicons name="flag-outline" size={20} color="#EF4444" />
              <Text style={[styles.rowText, { color: '#EF4444' }]}>Report</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelRow} onPress={animateClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    paddingTop: 4,
  },
  dragBar: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelRow: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
