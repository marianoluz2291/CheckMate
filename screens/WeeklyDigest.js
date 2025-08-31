import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { firebase } from '../config';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { format, startOfWeek, endOfWeek, addDays, parseISO, isWithinInterval } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';

const WeeklyDigest = ({ navigation }) => {
  const { theme, isDarkMode } = useContext(ThemeContext);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    upcomingTasks: 0,
    completionRate: 0,
    dailyCompletions: [0, 0, 0, 0, 0, 0, 0], // Sun-Sat
    productivityHours: [], // Added for productivity analysis
    hasCompletionTimeData: false, // Flag to check if we have completion time data
  });
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetchTaskData()
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

  const fetchTaskData = async () => {
    try {
      // Get the current week's start and end dates
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday

      // Get all tasks
      firebase.firestore().collection('tasks').where('user_id', '==', userId).onSnapshot((querySnapshot) => {
        const tasks = [];
        querySnapshot.forEach((doc) => {
          tasks.push({ id: doc.id, ...doc.data() });
        });
        // Process tasks
        processTaskData(tasks, weekStart, weekEnd);
      });
    } catch (error) {
      console.error('Error fetching task data:', error);
    }
  };

  const processTaskData = (tasks, weekStart, weekEnd) => {
    // Filter tasks for the current week (created or due this week)
    const currentWeekTasks = tasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = task.due_date.toDate();
      return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
    });
    // Tasks completed this week
    const completedThisWeek = tasks.filter(task =>
      task.is_completed &&
      task.due_date &&
      isWithinInterval(task.due_date.toDate(), { start: weekStart, end: weekEnd })
    );
    // Tasks due in the coming week
    const nextWeekStart = addDays(weekEnd, 1);
    const nextWeekEnd = addDays(nextWeekStart, 6);
    const upcomingTasks = tasks.filter(task =>
      !task.is_completed &&
      task.due_date &&
      isWithinInterval(task.due_date.toDate(), { start: nextWeekStart, end: nextWeekEnd })
    );
    // Calculate daily completions for the week
    const dailyCompletions = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    completedThisWeek.forEach(task => {
      const dueDate = task.due_date.toDate();
      const dayOfWeek = dueDate.getDay(); // 0 = Sunday, 6 = Saturday
      dailyCompletions[dayOfWeek]++;
    });
    // Calculate completion rate
    const completionRate = currentWeekTasks.length > 0
      ? Math.round((completedThisWeek.length / currentWeekTasks.length) * 100)
      : 0;
    // Calculate productivity by hour (when tasks are completed)
    const hourlyCompletions = Array(24).fill(0);
    let hasCompletionTimeData = false;
    // Filter tasks that have completed_time data
    const tasksWithCompletionTime = tasks.filter(task =>
      task.is_completed && task.completed_time
    );
    if (tasksWithCompletionTime.length > 0) {
      hasCompletionTimeData = true;
      tasksWithCompletionTime.forEach(task => {
        try {
          const completionTime = parseISO(task.completed_time);
          const hour = completionTime.getHours();
          hourlyCompletions[hour]++;
        } catch (e) {
          console.warn('Invalid completion_time format:', task.completed_time);
        }
      });
    }
    // Find the most productive hours (top 3)
    const productivityHours = hourlyCompletions
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .filter(item => item.count > 0);
    setStats({
      totalTasks: currentWeekTasks.length,
      completedTasks: completedThisWeek.length,
      upcomingTasks: upcomingTasks.length,
      completionRate,
      dailyCompletions,
      productivityHours,
      hasCompletionTimeData,
    });
  };

  const chartData = {
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [
      {
        data: stats.dailyCompletions,
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: theme.colors.card,
    backgroundGradientTo: theme.colors.card,
    color: (opacity = 1) => theme.colors.primary + (opacity * 255).toString(16).slice(0, 2),
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    labelColor: () => theme.colors.text,
  };

  // Function to format hour to AM/PM format
  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour} ${ampm}`;
  };

  const currentWeekRange = `${format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'MMM d')} - ${format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'MMM d, yyyy')}`;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.headerText}>Weekly Task Digest</Text>
        <Text style={styles.dateRange}>{currentWeekRange}</Text>
      </View>

      <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.completedTasks}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.secondaryText }]}>Completed</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.totalTasks}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.secondaryText }]}>Total Tasks</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.completionRate}%</Text>
          <Text style={[styles.statLabel, { color: theme.colors.secondaryText }]}>Completion Rate</Text>
        </View>
      </View>

      <View style={[styles.upcomingContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Coming Up Next Week</Text>
        <Text style={[styles.upcomingValue, { color: theme.colors.primary }]}>{stats.upcomingTasks} tasks due</Text>
      </View>

      {/* Productivity section */}
      <View style={[styles.productivityContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Productivity Hours</Text>

        {!stats.hasCompletionTimeData || stats.productivityHours.length === 0 ? (
          <Text style={[styles.noDataText, { color: theme.colors.secondaryText }]}>
            Not enough information for this report.
          </Text>
        ) : (
          <View style={styles.productivityContent}>
            <Text style={[styles.productivityIntro, { color: theme.colors.text }]}>
              You're most productive during:
            </Text>

            {stats.productivityHours.map((item, index) => (
              <View key={index} style={styles.productivityTimeSlot}>
                <View style={[styles.timeIndicator, { backgroundColor: theme.colors.primary }]}>
                  <Feather name="clock" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.timeDetails}>
                  <Text style={[styles.timeRange, { color: theme.colors.text }]}>
                    {formatHour(item.hour)} - {formatHour((item.hour + 1) % 24)}
                  </Text>
                  <Text style={[styles.taskCount, { color: theme.colors.secondaryText }]}>
                    {item.count} {item.count === 1 ? 'task' : 'tasks'} completed
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.chartContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tasks Completed By Day</Text>
        <BarChart
          data={chartData}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={chartConfig}
          fromZero
          showValuesOnTopOfBars
          style={styles.chart}
        />
      </View>

      <TouchableOpacity
        style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
        onPress={fetchTaskData}
      >
        <Feather name="refresh-cw" size={16} color="#FFFFFF" />
        <Text style={styles.refreshButtonText}>Refresh Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateRange: {
    fontSize: 16,
    color: '#e0e9ff',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  upcomingContainer: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  upcomingValue: {
    fontSize: 20,
    fontWeight: '500',
  },
  // New styles for productivity section
  productivityContainer: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noDataText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  productivityContent: {
    marginTop: 8,
  },
  productivityIntro: {
    fontSize: 16,
    marginBottom: 12,
  },
  productivityTimeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timeDetails: {
    flex: 1,
  },
  timeRange: {
    fontSize: 16,
    fontWeight: '500',
  },
  taskCount: {
    fontSize: 14,
    marginTop: 2,
  },
  chartContainer: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    padding: 12,
    borderRadius: 24,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default WeeklyDigest;