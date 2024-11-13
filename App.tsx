// App.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import Geolocation from '@react-native-community/geolocation';
import BackgroundTimer from 'react-native-background-timer';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const App = () => {
  const [stepCount, setStepCount] = useState(0);
  const [distance, setDistance] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [stepHistory, setStepHistory] = useState(new Array(24).fill(0));

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    if (tracking) {
      setUpdateIntervalForType(SensorTypes.accelerometer, 400);

      const stepCounter = accelerometer.subscribe(({ x, y, z }) => {
        handleStepCounting(x, y, z);
      });

      const locationWatcher = Geolocation.watchPosition(
        position => handleLocation(position),
        error => console.log(error),
        { enableHighAccuracy: true, distanceFilter: 1 }
      );

      BackgroundTimer.start();
      BackgroundTimer.runBackgroundTimer(() => updateHourlySteps(), 3600000);

      return () => {
        stepCounter && stepCounter.unsubscribe();
        locationWatcher && Geolocation.clearWatch(locationWatcher);
        BackgroundTimer.stop();
      };
    }
  }, [tracking]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
    }
  };

  const handleStepCounting = (x, y, z) => {
    const threshold = 1.1;
    const accelerationMagnitude = Math.sqrt(x * x + y * y + z * z);

    if (accelerationMagnitude > threshold) {
      setStepCount(prevCount => prevCount + 1);
    }
  };

  const handleLocation = ({ coords }) => {
    const { latitude, longitude } = coords;

    if (lastLocation) {
      const distanceBetween = calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        latitude,
        longitude
      );
      setDistance(prevDistance => prevDistance + distanceBetween);
    }

    setLastLocation({ latitude, longitude });
  };

  const calculateDistance = (latitude1, longitude1, latitude2, longitude2) => {
    const toRadians = angle => (Math.PI / 180) * angle;
    const earthRadius = 6371e3; // Earth's radius in meters
    const lat1InRadians = toRadians(latitude1);
    const lat2InRadians = toRadians(latitude2);
    const deltaLat = toRadians(latitude2 - latitude1);
    const deltaLon = toRadians(longitude2 - longitude1);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1InRadians) * Math.cos(lat2InRadians) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * centralAngle; // Distance in meters
  };


  const updateHourlySteps = () => {
    const currentHour = new Date().getHours();
    setStepHistory(prevHistory => {
      const newHistory = [...prevHistory];
      newHistory[currentHour] = stepCount;
      return newHistory;
    });
  };

  const toggleTracking = () => setTracking(!tracking);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Fitness Tracker</Text>
      <View style={styles.statusContainer}>
        <View style={styles.statusBox}>
          <Icon name="walk" size={30} color="#ffa726" />
          <Text style={styles.statusText}>Steps: {stepCount}</Text>
        </View>
        <View style={styles.statusBox}>
          <Icon name="map-marker-distance" size={30} color="#ffa726" />
          <Text style={styles.statusText}>Distance: {distance.toFixed(2)} m</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.trackButton, tracking ? styles.trackButtonActive : null]}
        onPress={toggleTracking}
      >
        <Icon
          name={tracking ? 'pause-circle-outline' : 'play-circle-outline'}
          size={60}
          color="#fff"
        />
        <Text style={styles.trackButtonText}>
          {tracking ? 'Stop Tracking' : 'Start Tracking'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.chartTitle}>Hourly Step Count</Text>
      <LineChart
        data={{
          labels: Array.from({ length: 24 }, (_, i) => i.toString()),
          datasets: [{ data: stepHistory }],
        }}
        width={320}
        height={220}
        yAxisSuffix=" steps"
        chartConfig={{
          backgroundColor: '#ffa726',
          backgroundGradientFrom: '#fb8c00',
          backgroundGradientTo: '#ffb74d',
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: { borderRadius: 16 },
        }}
        style={{ marginVertical: 8, borderRadius: 16 }}
      />
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1e1e', padding: 20 },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#ffa726', marginBottom: 10 },
  statusContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  statusBox: { flex: 1, alignItems: 'center', padding: 10 },
  statusText: { fontSize: 18, color: '#fff', marginTop: 5 },
  trackButton: {
    backgroundColor: '#ffa726',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    alignItems: 'center',
    marginVertical: 20,
  },
  trackButtonActive: { backgroundColor: '#e65100' },
  trackButtonText: { color: '#fff', fontSize: 18, marginTop: 5 },
  chartTitle: { fontSize: 18, color: '#fff', marginTop: 20 },
});
