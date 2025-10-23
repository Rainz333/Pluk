import React, { useState, useEffect } from 'react';
import { Camera, Droplets, Sun, Plus, X, Trash2, LogOut, User } from 'lucide-react';

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
  const [sunHours, setSunHours] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [newPlant, setNewPlant] = useState({
    type: 'suculenta',
    species: '',
    nickname: '',
    photo: null
  });

  useEffect(() => {
    const savedUser = sessionStorage.getItem('plukUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setShowLogin(false);
      loadUserPlants(userData.email);
    }
  }, []);

  const loadUserPlants = (email) => {
    const savedPlants = sessionStorage.getItem(`plukPlants_${email}`);
    if (savedPlants) {
      setPlants(JSON.parse(savedPlants));
    }
  };

  const savePlants = (updatedPlants, userEmail) => {
    sessionStorage.setItem(`plukPlants_${userEmail}`, JSON.stringify(updatedPlants));
    setPlants(updatedPlants);
  };

  const handleLogin = () => {
    if (!loginEmail || !loginPassword) return;

    if (isRegistering) {
      const users = JSON.parse(sessionStorage.getItem('plukUsers') || '[]');
      const existingUser = users.find(u => u.email === loginEmail);
      
      if (existingUser) {
        alert('Usuário já existe!');
        return;
      }
      
      const newUser = { email: loginEmail, password: loginPassword };
      users.push(newUser);
      sessionStorage.setItem('plukUsers', JSON.stringify(users));
      sessionStorage.setItem('plukUser', JSON.stringify(newUser));
      setUser(newUser);
      setShowLogin(false);
      loadUserPlants(loginEmail);
    } else {
      const users = JSON.parse(sessionStorage.getItem('plukUsers') || '[]');
      const foundUser = users.find(u => u.email === loginEmail && u.password === loginPassword);
      
      if (foundUser) {
        sessionStorage.setItem('plukUser', JSON.stringify(foundUser));
        setUser(foundUser);
        setShowLogin(false);
        loadUserPlants(loginEmail);
      } else {
        alert('Email ou senha incorretos!');
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('plukUser');
    setUser(null);
    setPlants([]);
    setShowLogin(true);
  };

  const handleAddPlant = () => {
    if (!newPlant.nickname) {
      alert('Por favor, dê um apelido para sua planta!');
      return;
    }

    const plantType = PLANT_TYPES[newPlant.type];
    const plant = {
      id: Date.now(),
      ...newPlant,
      typeName: plantType.name,
      icon: plantType.icon,
      nextWater: Date.now() + (plantType.waterDays * 24 * 60 * 60 * 1000),
      nextSun: Date.now() + (plantType.sunHours * 60 * 60 * 1000),
      waterDays: plantType.waterDays,
      sunHours: plantType.sunHours,
      totalSunHours: 0,
      lastWatered: Date.now(),
      lastSunned: Date.now()
    };

    const updatedPlants = [...plants, plant];
    savePlants(updatedPlants, user.email);
    setShowAddPlant(false);
    setNewPlant({ type: 'suculenta', species: '', nickname: '', photo: null });
  };

  const handleWaterPlant = (plantId) => {
    const updatedPlants = plants.map(p => {
      if (p.id === plantId) {
        return {
          ...p,
          nextWater: Date.now() + (p.waterDays * 24 * 60 * 60 * 1000),
          lastWatered: Date.now()
        };
      }
      return p;
    });
    savePlants(updatedPlants, user.email);
    if (selectedPlant?.id === plantId) {
      setSelectedPlant(updatedPlants.find(p => p.id === plantId));
    }
  };

  const handleSunPlant = (plantId) => {
    const hours = parseFloat(sunHours);
    if (!hours || hours <= 0) {
      alert('Digite um valor válido de horas!');
      return;
    }

    const updatedPlants = plants.map(p => {
      if (p.id === plantId) {
        return {
          ...p,
          nextSun: Date.now() + (p.sunHours * 60 * 60 * 1000),
          lastSunned: Date.now(),
          totalSunHours: (p.totalSunHours || 0) + hours
        };
      }
      return p;
    });
    savePlants(updatedPlants, user.email);
    setSunHours('');
    if (selectedPlant?.id === plantId) {
      setSelectedPlant(updatedPlants.find(p => p.id === plantId));
    }
  };

  const handleDeletePlant = (plantId) => {
    if (!window.confirm('Tem certeza que deseja remover esta planta?')) return;
    const updatedPlants = plants.filter(p => p.id !== plantId);
    savePlants(updatedPlants, user.email);
    setSelectedPlant(null);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPlant({ ...newPlant, photo: reader.result });
      };
      reader.readAsDataURL(file);
    }
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
              />
            </div>
            
            <button
              onClick={handleLogin}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              {isRegistering ? 'Criar Conta' : 'Entrar'}
            </button>
            
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full text-green-600 py-2 text-sm hover:underline"
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
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <User size={16} />
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <LogOut size={18} />
              Sair
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
      </main>

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
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto da Planta</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                {newPlant.photo && (
                  <img src={newPlant.photo} alt="Preview" className="mt-2 w-full h-40 object-cover rounded-lg" />
                )}
              </div>
              
              <button
                onClick={handleAddPlant}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Adicionar Planta
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPlant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{selectedPlant.nickname}</h2>
              <button onClick={() => setSelectedPlant(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            {selectedPlant.photo ? (
              <img src={selectedPlant.photo} alt={selectedPlant.nickname} className="w-full h-64 object-cover rounded-xl mb-6" />
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
    </div>
  );
};
