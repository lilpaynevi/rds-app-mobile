// components/CustomTimePicker.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Modal } from 'react-native';

const { width, height } = Dimensions.get('window');

const CustomTimePicker = ({
  visible,
  onClose,
  onConfirm,
  initialTime = '08:00',
  title = 'Sélectionner l\'heure',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
}) => {
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [slideAnim] = useState(new Animated.Value(height));

  useEffect(() => {
    if (initialTime) {
      const [hour, minute] = initialTime.split(':').map(Number);
      setSelectedHour(hour);
      setSelectedMinute(minute);
    }
  }, [initialTime]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const formatTime = (hour, minute) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    const timeString = formatTime(selectedHour, selectedMinute);
    onConfirm(timeString);
    onClose();
  };

  const TimeColumn = ({ data, selectedValue, onSelect, unit }) => (
    <View style={styles.timeColumn}>
      <Text style={styles.columnHeader}>{unit}</Text>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        snapToInterval={50}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {data.map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.timeItem,
              selectedValue === value && styles.selectedTimeItem,
            ]}
            onPress={() => onSelect(value)}
          >
            <Text
              style={[
                styles.timeText,
                selectedValue === value && styles.selectedTimeText,
              ]}
            >
              {value.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={styles.blurView} />
        
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Time Display */}
          <View style={styles.timeDisplay}>
            <View style={styles.digitalClock}>
              <Text style={styles.digitalTime}>
                {formatTime(selectedHour, selectedMinute)}
              </Text>
            </View>
          </View>

          {/* Time Picker */}
          <View style={styles.timePickerContainer}>
            <TimeColumn
              data={hours}
              selectedValue={selectedHour}
              onSelect={setSelectedHour}
              unit="Heures"
            />
            
            <View style={styles.separator}>
              <Text style={styles.separatorText}>:</Text>
            </View>
            
            <TimeColumn
              data={minutes}
              selectedValue={selectedMinute}
              onSelect={setSelectedMinute}
              unit="Minutes"
            />
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsContainer}>
            <Text style={styles.presetsTitle}>Raccourcis</Text>
            <View style={styles.presetButtons}>
              {[
                { label: '8:00', hour: 8, minute: 0 },
                { label: '12:00', hour: 12, minute: 0 },
                { label: '14:00', hour: 14, minute: 0 },
                { label: '18:00', hour: 18, minute: 0 },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.presetButton,
                    selectedHour === preset.hour && 
                    selectedMinute === preset.minute && 
                    styles.activePreset,
                  ]}
                  onPress={() => {
                    setSelectedHour(preset.hour);
                    setSelectedMinute(preset.minute);
                  }}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      selectedHour === preset.hour && 
                      selectedMinute === preset.minute && 
                      styles.activePresetText,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  timeDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  digitalClock: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E3F2FD',
  },
  digitalTime: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2575fc',
    fontFamily: 'monospace',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 200,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  scrollView: {
    height: 150,
  },
  scrollContent: {
    paddingVertical: 50,
  },
  timeItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 12,
    minWidth: 60,
  },
  selectedTimeItem: {
    backgroundColor: '#2575fc',
    shadowColor: '#2575fc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  selectedTimeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  separator: {
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2575fc',
  },
  presetsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  presetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activePreset: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2575fc',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activePresetText: {
    color: '#2575fc',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#2575fc',
    shadowColor: '#2575fc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
};

export default CustomTimePicker;
