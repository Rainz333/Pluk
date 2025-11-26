import React, { useState, useEffect } from 'react';
import { Camera, Droplets, Sun, Plus, X, Trash2, LogOut, User, MapPin, Store, Navigation } from 'lucide-react';

// Imports do Firebase (certifique-se de ter um arquivo firebaseConfig.js)
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Configure seu Firebase aqui
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const PLANT_TYPES = {
  suculenta: { name: 'Suculenta', icon: '🌵', waterDays: 7, sunHours: 4 },
  samambaia: { name: 'Samambaia', icon: '🌿', waterDays: 2, sunHours: 2 },
  cacto: { name: 'Cacto', icon: '🌵', waterDays: 10, sunHours: 6 },
  orquidea: { name: 'Orquídea', icon: '🌸', waterDays: 3, sunHours: 3 },
  violeta: { name: 'Violeta', icon: '🌺', waterDays: 2, sunHours: 4 },
  jiboia: { name: 'Jiboia', icon: '🍃', waterDays: 3, sunHours: 2 },
};

const PlukApp = () => {
  const [user, setUser] = useState(null);
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [sunHours, setSunHours] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyStores, setNearbyStores] = useState([]);
  const [newPlant, setNewPlant] = useState({
    type: 'suculenta',
    species: '',
    nickname: '',
    photoFile: null,
    photoURL: null
  });

  // Monitora autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setShowLogin(false);
        loadUserPlants(currentUser.uid);
      } else {
        setUser(null);
        setPlants([]);
        setShowLogin(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Carrega plantas do Firestore em tempo real
  const loadUserPlants = (userId) => {
    const q = query(collection(db, 'plants'), where('userId', '==', userId));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userPlants = [];
      querySnapshot.forEach((doc) => {
        userPlants.push({ id: doc.id, ...doc.data() });
      });
      setPlants(userPlants);
    }, (error) => {
      console.error('Erro ao carregar plantas:', error);
    });

    return unsubscribe;
  };

  // Login/Registro com Firebase Auth
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      alert('Preencha email e senha!');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      }
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert('Este email já está cadastrado!');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        alert('Email ou senha incorretos!');
      } else if (error.code === 'auth/weak-password') {
        alert('A senha deve ter pelo menos 6 caracteres!');
      } else {
        alert('Erro: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Upload de foto para Firebase Storage
  const uploadPhoto = async (file) => {
    if (!file) return null;
    
    const storageRef = ref(storage, `plants/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  // Adicionar planta ao Firestore
  const handleAddPlant = async () => {
    if (!newPlant.nickname) {
      alert('Por favor, dê um apelido para sua planta!');
      return;
    }

    setLoading(true);
    try {
      const plantType = PLANT_TYPES[newPlant.type];
      let photoURL = null;

      if (newPlant.photoFile) {
        photoURL = await uploadPhoto(newPlant.photoFile);
      }

      const plant = {
        userId: user.uid,
        type: newPlant.type,
        species: newPlant.species,
        nickname: newPlant.nickname,
        photoURL: photoURL,
        typeName: plantType.name,
        icon: plantType.icon,
        nextWater: Date.now() + (plantType.waterDays * 24 * 60 * 60 * 1000),
        nextSun: Date.now() + (plantType.sunHours * 60 * 60 * 1000),
        waterDays: plantType.waterDays,
        sunHours: plantType.sunHours,
        totalSunHours: 0,
        lastWatered: Date.now(),
        lastSunned: Date.now(),
        createdAt: Date.now()
      };

      await addDoc(collection(db, 'plants'), plant);
      
      setShowAddPlant(false);
      setNewPlant({ type: 'suculenta', species: '', nickname: '', photoFile: null, photoURL: null });
    } catch (error) {
      console.error('Erro ao adicionar planta:', error);
      alert('Erro ao adicionar planta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Atualizar rega no Firestore
  const handleWaterPlant = async (plantId) => {
    try {
      const plant = plants.find(p => p.id === plantId);
      if (!plant) return;

      const plantRef = doc(db, 'plants', plantId);
      await updateDoc(plantRef, {
        nextWater: Date.now() + (plant.waterDays * 24 * 60 * 60 * 1000),
        lastWatered: Date.now()
      });

      if (selectedPlant?.id === plantId) {
        setSelectedPlant({ ...selectedPlant, nextWater: Date.now() + (plant.waterDays * 24 * 60 * 60 * 1000), lastWatered: Date.now() });
      }
    } catch (error) {
      console.error('Erro ao regar planta:', error);
      alert('Erro ao atualizar rega!');
    }
  };

  // Atualizar sol no Firestore
  const handleSunPlant = async (plantId) => {
    const hours = parseFloat(sunHours);
    if (!hours || hours <= 0) {
      alert('Digite um valor válido de horas!');
      return;
    }

    try {
      const plant = plants.find(p => p.id === plantId);
      if (!plant) return;

      const plantRef = doc(db, 'plants', plantId);
      await updateDoc(plantRef, {
        nextSun: Date.now() + (plant.sunHours * 60 * 60 * 1000),
        lastSunned: Date.now(),
        totalSunHours: (plant.totalSunHours || 0) + hours
      });

      setSunHours('');
      if (selectedPlant?.id === plantId) {
        setSelectedPlant({ 
          ...selectedPlant, 
          nextSun: Date.now() + (plant.sunHours * 60 * 60 * 1000), 
          lastSunned: Date.now(),
          totalSunHours: (plant.totalSunHours || 0) + hours
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar sol:', error);
      alert('Erro ao atualizar sol!');
    }
  };

  // Deletar planta do Firestore
  const handleDeletePlant = async (plantId) => {
    if (!window.confirm('Tem certeza que deseja remover esta planta?')) return;
    
    try {
      await deleteDoc(doc(db, 'plants', plantId));
      setSelectedPlant(null);
    } catch (error) {
      console.error('Erro ao deletar planta:', error);
      alert('Erro ao remover planta!');
    }
  };

  // Upload de foto com preview
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPlant({ ...newPlant, photoFile: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPlant(prev => ({ ...prev, photoURL: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Buscar lojas de jardinagem próximas
  const findNearbyStores = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo seu navegador!');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Buscar lojas usando Google Places API
        searchNearbyPlantStores(latitude, longitude);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        alert('Não foi possível obter sua localização. Verifique as permissões.');
        setLoading(false);
      }
    );
  };

  const searchNearbyPlantStores = async (lat, lng) => {
    try {
      // Usando Overpass API (OpenStreetMap) - GRATUITO!
      // Busca por garden centres, florists e plant nurseries num raio de 5km
      const radius = 5000; // 5km em metros
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["shop"="garden_centre"](around:${radius},${lat},${lng});
          node["shop"="florist"](around:${radius},${lat},${lng});
          node["shop"="garden"](around:${radius},${lat},${lng});
          node["landuse"="plant_nursery"](around:${radius},${lat},${lng});
          way["shop"="garden_centre"](around:${radius},${lat},${lng});
          way["shop"="florist"](around:${radius},${lat},${lng});
          way["shop"="garden"](around:${radius},${lat},${lng});
        );
        out center;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery
      });

      const data = await response.json();
      
      if (data.elements && data.elements.length > 0) {
        const stores = data.elements.map((element, index) => {
          const storeLat = element.lat || element.center?.lat;
          const storeLng = element.lon || element.center?.lon;
          const distance = calculateDistance(lat, lng, storeLat, storeLng);
          
          return {
            id: element.id || index,
            name: element.tags?.name || element.tags?.['name:pt'] || `Loja de Jardinagem #${index + 1}`,
            address: formatAddress(element.tags),
            distance: `${distance.toFixed(1)} km`,
            distanceValue: distance,
            phone: element.tags?.phone || element.tags?.['contact:phone'] || 'Não disponível',
            website: element.tags?.website || null,
            lat: storeLat,
            lng: storeLng,
            type: element.tags?.shop || 'garden'
          };
        });

        // Ordena por distância
        stores.sort((a, b) => a.distanceValue - b.distanceValue);
        
        // Pega apenas as 10 mais próximas
        setNearbyStores(stores.slice(0, 10));
      } else {
        setNearbyStores([]);
        alert('Nenhuma loja de jardinagem encontrada nas proximidades (raio de 5km).');
      }
      
      setShowMap(true);
    } catch (error) {
      console.error('Erro ao buscar lojas:', error);
      alert('Erro ao buscar lojas próximas! Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // Calcula distância entre dois pontos (fórmula de Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Formata endereço a partir das tags do OSM
  const formatAddress = (tags) => {
    if (!tags) return 'Endereço não disponível';
    
    const parts = [];
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:neighbourhood']) parts.push(tags['addr:neighbourhood']);
    if (tags['addr:suburb']) parts.push(tags['addr:suburb']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    
    return parts.length > 0 ? parts.join(', ') : 'Endereço não disponível';
  };

  const openGoogleMaps = (lat, lng, name) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`, '_blank');
  };

  const formatTimeRemaining = (timestamp) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return 'Agora!';
    
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-green-600 mb-2">🌱 Pluk</h1>
            <p className="text-gray-600">Cuide das suas plantas com carinho</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="seu@email.com"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Carregando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
            </button>
            
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full text-green-600 py-2 text-sm hover:underline"
              disabled={loading}
            >
              {isRegistering ? 'Já tem conta? Faça login' : 'Não tem conta? Registre-se'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <header className="bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-green-600">🌱 Pluk</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={findNearbyStores}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <Store size={18} />
              <span className="hidden sm:inline">Lojas</span>
            </button>
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <User size={16} />
              <span className="hidden sm:inline">{user?.email}</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => setShowAddPlant(true)}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition shadow-lg"
          >
            <Plus size={20} />
            Adicionar Planta
          </button>
        </div>

        {loading && plants.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Carregando suas plantas...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {plants.map(plant => (
                <div
                  key={plant.id}
                  onClick={() => setSelectedPlant(plant)}
                  className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition transform hover:scale-105"
                >
                  <div className="text-6xl text-center mb-4">{plant.icon}</div>
                  <h3 className="text-xl font-bold text-gray-800 text-center mb-4">{plant.nickname}</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Droplets size={18} className="text-blue-600" />
                        <span className="text-sm text-gray-700">Regar em:</span>
                      </div>
                      <span className="font-semibold text-blue-600">
                        {formatTimeRemaining(plant.nextWater)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between bg-yellow-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Sun size={18} className="text-yellow-600" />
                        <span className="text-sm text-gray-700">Sol em:</span>
                      </div>
                      <span className="font-semibold text-yellow-600">
                        {formatTimeRemaining(plant.nextSun)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {plants.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🌿</div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Nenhuma planta ainda</h2>
                <p className="text-gray-500">Adicione sua primeira planta para começar!</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal Adicionar Planta */}
      {showAddPlant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Nova Planta</h2>
              <button onClick={() => setShowAddPlant(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Planta</label>
                <select
                  value={newPlant.type}
                  onChange={(e) => setNewPlant({ ...newPlant, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  disabled={loading}
                >
                  {Object.entries(PLANT_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.icon} {val.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Espécie</label>
                <input
                  type="text"
                  value={newPlant.species}
                  onChange={(e) => setNewPlant({ ...newPlant, species: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Aloe Vera"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apelido *</label>
                <input
                  type="text"
                  value={newPlant.nickname}
                  onChange={(e) => setNewPlant({ ...newPlant, nickname: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Minha Plantinha"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto da Planta</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  disabled={loading}
                />
                {newPlant.photoURL && (
                  <img src={newPlant.photoURL} alt="Preview" className="mt-2 w-full h-40 object-cover rounded-lg" />
                )}
              </div>
              
              <button
                onClick={handleAddPlant}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? 'Adicionando...' : 'Adicionar Planta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes da Planta */}
      {selectedPlant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{selectedPlant.nickname}</h2>
              <button onClick={() => setSelectedPlant(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            {selectedPlant.photoURL ? (
              <img src={selectedPlant.photoURL} alt={selectedPlant.nickname} className="w-full h-64 object-cover rounded-xl mb-6" />
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center mb-6">
                <div className="text-center">
                  <Camera size={48} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Sem foto</p>
                </div>
              </div>
            )}
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-semibold">{selectedPlant.icon} {selectedPlant.typeName}</span>
              </div>
              {selectedPlant.species && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Espécie:</span>
                  <span className="font-semibold">{selectedPlant.species}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Total de horas de sol:</span>
                <span className="font-semibold">{selectedPlant.totalSunHours || 0}h</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => handleWaterPlant(selectedPlant.id)}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                <Droplets size={20} />
                Já Reguei Esta Planta
              </button>
              
              <div className="flex gap-2">
                <input
                  type="number"
                  value={sunHours}
                  onChange={(e) => setSunHours(e.target.value)}
                  placeholder="Horas"
                  step="0.5"
                  min="0"
                  className="flex-1 px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500"
                />
                <button
                  onClick={() => handleSunPlant(selectedPlant.id)}
                  className="flex items-center justify-center gap-2 bg-yellow-500 text-white px-6 py-4 rounded-xl font-semibold hover:bg-yellow-600 transition"
                >
                  <Sun size={20} />
                  Tomou Sol
                </button>
              </div>
              
              <button
                onClick={() => handleDeletePlant(selectedPlant.id)}
                className="w-full flex items-center justify-center gap-3 bg-red-500 text-white py-4 rounded-xl font-semibold hover:bg-red-600 transition"
              >
                <Trash2 size={20} />
                Remover Planta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mapa de Lojas */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Store size={28} className="text-green-600" />
                Lojas de Jardinagem Próximas
              </h2>
              <button onClick={() => setShowMap(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            {userLocation && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center gap-2">
                <MapPin size={20} className="text-green-600" />
                <span className="text-sm text-gray-700">
                  Sua localização: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </span>
              </div>
            )}
            
            <div className="space-y-4">
              {nearbyStores.map(store => (
                <div key={store.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">{store.name}</h3>
                      <p className="text-gray-600 text-sm mb-1">{store.address}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-green-600 font-semibold flex items-center gap-1">
                          <Navigation size={14} />
                          {store.distance}
                        </span>
                        {store.phone && store.phone !== 'Não disponível' && (
                          <span className="text-gray-600">📞 {store.phone}</span>
                        )}
                      </div>
                      {store.website && (
                        <a 
                          href={store.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm hover:underline mt-1 inline-block"
                        >
                          🌐 Visitar site
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => openGoogleMaps(store.lat, store.lng, store.name)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
                  >
                    <Navigation size={18} />
                    Ver no Google Maps
                  </button>
                </div>
              ))}

              {nearbyStores.length === 0 && (
                <div className="text-center py-10">
                  <Store size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma loja encontrada nas proximidades</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlukApp;