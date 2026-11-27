import React, { createContext, useContext, useState, useEffect } from 'react';

const PropertySetupContext = createContext(null);

const DEFAULT_ROOM_COUNT = 5;
const DEFAULT_RENT = 8000;
const DEFAULT_POWER_RATE = 8.5;

const generateInitialRooms = (count, rent = DEFAULT_RENT, powerRate = DEFAULT_POWER_RATE) => {
  return Array.from({ length: count }, (_, i) => {
    const roomNum = 101 + i;
    return {
      id: `room-${roomNum}`,
      roomNumber: `${roomNum}`,
      status: 'VACANT',
      monthlyRent: rent,
      electricityRate: powerRate,
    };
  });
};

export function PropertySetupProvider({ children }) {
  // Owner profile
  const [owner, setOwner] = useState(() => {
    const saved = localStorage.getItem('rm_owner');
    return saved
      ? JSON.parse(saved)
      : {
          fullName: '',
          mobile: '',
          email: '',
          isLoggedIn: false,
        };
  });

  // Step 1: Property Details
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');

  // Step 2: Room Count & Room List
  const [roomCount, setRoomCountState] = useState(DEFAULT_ROOM_COUNT);
  const [rooms, setRooms] = useState(() =>
    generateInitialRooms(DEFAULT_ROOM_COUNT, DEFAULT_RENT, DEFAULT_POWER_RATE)
  );

  // Step 3: Default Rates
  const [defaultMonthlyRent, setDefaultMonthlyRentState] = useState('');
  const [defaultElectricityRate, setDefaultElectricityRateState] = useState('');

  // Property Creation Flag & Persistent Properties List
  const [createdProperty, setCreatedProperty] = useState(() => {
    const saved = localStorage.getItem('rm_created_property');
    return saved ? JSON.parse(saved) : null;
  });

  // Keep localStorage updated for owner
  useEffect(() => {
    localStorage.setItem('rm_owner', JSON.stringify(owner));
  }, [owner]);

  // Save created property to localStorage
  useEffect(() => {
    if (createdProperty) {
      localStorage.setItem('rm_created_property', JSON.stringify(createdProperty));
    }
  }, [createdProperty]);

  /**
   * Adjust Room Count dynamically:
   * Keeps existing customized room names and appends or trims
   */
  const setRoomCount = (newCount) => {
    const safeCount = Math.max(1, Math.min(100, newCount));
    setRoomCountState(safeCount);

    setRooms((prevRooms) => {
      if (prevRooms.length === safeCount) return prevRooms;

      if (safeCount > prevRooms.length) {
        // Add new rooms
        const extraRooms = Array.from(
          { length: safeCount - prevRooms.length },
          (_, i) => {
            const index = prevRooms.length + i;
            const roomNum = 101 + index;
            return {
              id: `room-${Date.now()}-${roomNum}`,
              roomNumber: `${roomNum}`,
              status: 'VACANT',
              monthlyRent: defaultMonthlyRent,
              electricityRate: defaultElectricityRate,
            };
          }
        );
        return [...prevRooms, ...extraRooms];
      } else {
        // Slice to new count
        return prevRooms.slice(0, safeCount);
      }
    });
  };

  /**
   * Update specific room's custom number or details
   */
  const updateRoomNumber = (index, newNumber) => {
    setRooms((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          roomNumber: newNumber.trim() || `Room ${101 + index}`,
        };
      }
      return updated;
    });
  };

  /**
   * Update default monthly rent and sync to rooms that haven't been manually altered
   */
  const setDefaultMonthlyRent = (amount) => {
    setDefaultMonthlyRentState(amount);
    const num = Number(amount) || 0;
    setRooms((prev) =>
      prev.map((r) => ({
        ...r,
        monthlyRent: num,
      }))
    );
  };

  /**
   * Update default electricity rate and sync to rooms
   */
  const setDefaultElectricityRate = (rate) => {
    setDefaultElectricityRateState(rate);
    const num = Number(rate) || 0;
    setRooms((prev) =>
      prev.map((r) => ({
        ...r,
        electricityRate: num,
      }))
    );
  };

  /**
   * Final creation step
   */
  const createProperty = () => {
    const rentNum = defaultMonthlyRent !== '' && defaultMonthlyRent !== null ? Number(defaultMonthlyRent) : null;
    const elecNum = defaultElectricityRate !== '' && defaultElectricityRate !== null ? Number(defaultElectricityRate) : null;
    const countNum = Number(roomCount) || rooms.length;

    const newProperty = {
      id: `prop-${Date.now()}`,
      propertyName: propertyName.trim() || 'My Property',
      address: address.trim() || 'Ahmedabad, Gujarat',
      propertyType: 'Co-living & Rental',
      roomCount: countNum,
      defaultMonthlyRent: rentNum,
      defaultElectricityRate: elecNum,
      rooms: rooms.map((r, idx) => ({
        roomNumber: String(r.roomNumber || (101 + idx)),
        floor: r.floor || 'Ground Fl',
        roomType: r.roomType || 'Single',
        status: 'VACANT', // Strictly VACANT
        monthlyRent: r.monthlyRent !== '' && r.monthlyRent !== null && r.monthlyRent !== undefined ? Number(r.monthlyRent) : rentNum,
        electricityRate: r.electricityRate !== '' && r.electricityRate !== null && r.electricityRate !== undefined ? Number(r.electricityRate) : elecNum,
      })),
      createdAt: new Date().toISOString(),
      owner,
    };

    setCreatedProperty(newProperty);
    return newProperty;
  };

  /**
   * Reset setup to start afresh
   */
  const resetSetup = () => {
    setPropertyName('');
    setAddress('');
    setRoomCountState(5);
    setRooms(generateInitialRooms(5, 8000, 8.5));
    setDefaultMonthlyRentState('');
    setDefaultElectricityRateState('');
  };

  return (
    <PropertySetupContext.Provider
      value={{
        owner,
        setOwner,
        propertyName,
        setPropertyName,
        address,
        setAddress,
        roomCount,
        setRoomCount,
        rooms,
        setRooms,
        updateRoomNumber,
        defaultMonthlyRent,
        setDefaultMonthlyRent,
        defaultElectricityRate,
        setDefaultElectricityRate,
        createdProperty,
        createProperty,
        resetSetup,
      }}
    >
      {children}
    </PropertySetupContext.Provider>
  );
}

export function usePropertySetup() {
  const context = useContext(PropertySetupContext);
  if (!context) {
    throw new Error('usePropertySetup must be used within a PropertySetupProvider');
  }
  return context;
}
