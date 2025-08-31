// screens/Dashboard.js
import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';
import { firebase } from '../config';
import * as ImagePicker from 'expo-image-picker';

// Task category icons for fallback
const CATEGORY_ICONS = {
  work: "briefcase",
  personal: "user",
  health: "heartbeat",
  shopping: "shopping-cart",
  bills: "file-invoice-dollar",
  home: "home",
  default: "tasks"
};
// Define default colors for categories
const DEFAULT_CATEGORY_COLORS = {
  work: "#4285F4",
  personal: "#EA4335",
  health: "#34A853",
  shopping: "#FBBC05",
  bills: "#8F44FF",
  home: "#FF8800",
  default: "#FF87B2"
};

export default function Dashboard({ navigation }) {
  const { theme, isDarkMode } = useContext(ThemeContext);
  const [tasks, setTasks] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingTaskIds, setUpdatingTaskIds] = useState([]);
  const [categoryColors, setCategoryColors] = useState(DEFAULT_CATEGORY_COLORS);
  const [userId, setUserId] = useState(null);

  // Fetch tasks and categories on mount
  useEffect(() => {
    fetchTasks()
  }, []);

  useEffect(() => {
      const getCurrentUser = async () => {
        const user = firebase.auth().currentUser;
        if (!user) {
          Alert.alert('Error', 'User not authenticated');
          navigation.navigate('Login');
          return;
        }
        setUserId(user.uid);
      };
      getCurrentUser();
    }, []);

  const fetchTasks = async () => {
    try {
      setIsRefreshing(true);
      firebase.firestore().collection('tasks').where('user_id', '==', userId).onSnapshot((querySnapshot) => {
        const tasks = [];
        querySnapshot.forEach((doc) => {
          tasks.push({ id: doc.id, ...doc.data() });
        });
        // Process tasks
        const formattedTasks = tasks.map(doc => ({
          id: doc.id,
          text: doc.title,
          completed: doc.is_completed,
          image: doc.image_url || null,
        }));
        setTasks(formattedTasks);
        setIsRefreshing(false);
      });
    } catch (error) {
      console.error('Error fetching task data:', error);
    }
  }

  const onRefresh = () => {
    fetchTasks();
  };

  const navigateToTaskDetail = (taskId) => {
    navigation.navigate('TaskDetail', { taskId });
  };

  const deleteTask = async (id) => {
    try {
      await firebase.firestore()
        .collection('tasks')
        .doc(id)
        .delete();

        setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      console.error('Unexpected error deleting task:', err);
      Alert.alert('Error', 'Something went wrong while deleting the task.');
    }
  };

  const toggleComplete = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task || updatingTaskIds.includes(id)) return;

    // Add this task ID to the updating list
    setUpdatingTaskIds(prev => [...prev, id]);

    // Optimistic UI update - update the UI immediately before the server responds
    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );

    try {
      await firebase.firestore()
        .collection('tasks')
        .doc(id)
        .update({ is_completed: !task.completed });
        setUpdatingTaskIds(prev => prev.filter(itemId => itemId !== id));
    } catch (err) {
      console.error('Unexpected error updating task:', err);
      // Revert the optimistic update
      setTasks(prev =>
        prev.map(t => t.id === id ? { ...t, completed: task.completed } : t)
      );

      // Show error to user
      Alert.alert('Error', 'Something went wrong while updating the task.');
    }
  };

  const pickImage = async (taskId) => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to add images!');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await firebase.firestore()
          .collection('tasks')
          .doc(taskId)
          .update({ image_url: imageUri });

          setTasks(prev => 
            prev.map(task => 
              task.id === taskId ? { ...task, image: imageUri } : task
            )
          );
      }
    } catch (err) {
      console.error('Unexpected error picking image:', err);
      Alert.alert('Error', 'Something went wrong while selecting the image.');
    }
  };

  const getPendingTaskCount = () => {
    return tasks.filter(task => !task.completed).length;
  };

  const renderTaskThumbnail = (task) => {
    if (task.image) {
      // If the task has an image, display it
      return (
        <Image 
          source={{ uri: task.image }} 
          style={styles.taskImage} 
          accessibilityLabel="Task image"
        />
      );
    } else {
      // If no image, show a default icon with background color
      const iconName = CATEGORY_ICONS.default;

      // Use color from our dynamically loaded categoryColors state
      const backgroundColor = categoryColors.default;

      return (
        <TouchableOpacity
          style={[styles.taskIconContainer, { backgroundColor }]}
          onPress={() => pickImage(task.id)}
          accessibilityLabel={`Add image to task: ${task.text}`}
        >
          <FontAwesome5 name={iconName} size={16} color="white" />
        </TouchableOpacity>
      );
    }
  };

  const renderItem = ({ item }) => {
    const taskStatus = item.completed ? 'completed' : 'not completed';
    const isUpdating = updatingTaskIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.taskContainer,
          { backgroundColor: theme.colors.card }
        ]}
        accessible={true}
        accessibilityLabel={`Task: ${item.text}, ${taskStatus}`}
        accessibilityRole="button"
        onPress={() => navigateToTaskDetail(item.id)}
        disabled={isUpdating}
      >
        <TouchableOpacity
          style={styles.taskThumbnailContainer}
          onPress={() => pickImage(item.id)}
          accessibilityLabel="Tap to add or change task image"
          disabled={isUpdating}
        >
          {renderTaskThumbnail(item)}
        </TouchableOpacity>

        <View style={styles.taskContentContainer}>
          <TouchableOpacity
            style={styles.taskCheckbox}
            onPress={(e) => {
              e.stopPropagation(); // Prevent triggering the parent's onPress
              toggleComplete(item.id);
            }}
            disabled={isUpdating}
            accessibilityLabel={item.completed ? "Mark as not completed" : "Mark as completed"}
            accessibilityRole="checkbox"
            accessibilityState={{
              checked: item.completed,
              busy: isUpdating
            }}
          >
            {isUpdating ? (
              // Show a different icon or opacity when updating
              <MaterialIcons
                name={item.completed ? "check-circle" : "radio-button-unchecked"}
                size={24}
                color={theme.colors.primary}
                style={{ opacity: 0.5 }}
              />
            ) : item.completed ? (
              <MaterialIcons name="check-circle" size={24} color={theme.colors.primary} />
            ) : (
              <MaterialIcons name="radio-button-unchecked" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>

          <View style={styles.taskTextRow}>
            <View style={styles.taskTextContainer}>
              <Text
                style={[
                  styles.taskText,
                  { color: theme.colors.text },
                  item.completed && styles.completedTaskText,
                  isUpdating && { opacity: 0.7 }
                ]}
              >
                {item.text}
              </Text>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                deleteTask(item.id);
              }}
              disabled={isUpdating}
              accessibilityLabel="Delete task"
              accessibilityHint="Removes this task from your list"
              accessibilityRole="button"
            >
              <Feather
                name="trash-2"
                size={18}
                color={theme.colors.primary}
                style={isUpdating ? { opacity: 0.5 } : null}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.primary }]}>Your task list is empty</Text>
      <Text style={[styles.emptySubText, { color: theme.colors.secondaryText }]}>Add a new task to get started!</Text>
    </View>
  );

  const navigateToCreateTask = () => {
    navigation.navigate('CreateTask');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]} accessibilityRole="header">
        <View>
          <Text style={[styles.appTitle, { color: theme.colors.primary }]}>CheckMate</Text>
          <Text style={[styles.appSubtitle, { color: theme.colors.secondaryText }]}>
            Let's get checked up, mate!
          </Text>
        </View>

        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={isRefreshing}
            accessibilityLabel="Refresh tasks"
            accessibilityHint="Tap to refresh your task list"
          >
            <Feather
              name="refresh-cw"
              size={22}
              color={theme.colors.primary}
              style={isRefreshing ? styles.refreshingIcon : null}
            />
          </TouchableOpacity>

          <View style={[styles.summaryContainer, {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 135, 178, 0.1)' 
          }]}>
            <Text style={[styles.summaryText, { color: theme.colors.primary }]}>
              {getPendingTaskCount()} tasks pending
            </Text>
          </View>
        </View>
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />

      {/* Add New Task */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.inputContainer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}
      >
        <TouchableOpacity
          style={[styles.input, { backgroundColor: theme.colors.inputBackground }]}
          onPress={navigateToCreateTask}
        >
          <Text style={{ color: theme.colors.secondaryText, fontSize: 16 }}>
            Add a new task...
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={navigateToCreateTask}
          accessibilityLabel="Add task"
        >
          <Feather name="plus" size={24} color="white" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ----- Styles -----
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  appSubtitle: {
    fontSize: 12,
    marginTop: -2,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  refreshingIcon: {
    opacity: 0.6,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  taskContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  taskThumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  taskImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  taskIconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContentContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  taskCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  taskTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTextRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskText: {
    fontSize: 16,
    flexShrink: 1,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 'auto',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    justifyContent: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
  },
});