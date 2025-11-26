import React, { useState, useEffect } from 'react';
import { Camera, Droplets, Sun, Plus, X, Trash2, LogOut, User, Moon, Search, Wind, Eye, EyeOff } from 'lucide-react';

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================
// Para conectar com Firebase, descomente e configure abaixo:
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';

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


const PLANT_TYPES = {
  suculenta: { name: 'Suculenta', icon: '🌵', waterDays: 7, sunHours: 4 },
  samambaia: { name: 'Samambaia', icon: '🌿', waterDays: 2, sunHours: 2 },
  cacto: { name: 'Cacto', icon: '🌵', waterDays: 10, sunHours: 6 },
  orquidea: { name: 'Orquídea', icon: '🌸', waterDays: 3, sunHours: 3 },
  violeta: { name: 'Violeta', icon: '🌺', waterDays: 2, sunHours: 4 },
  jiboia: { name: 'Jiboia', icon: '🍃', waterDays: 3, sunHours: 2 },
};

const PlukApp = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [sunHours, setSunHours] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [weather, setWeather] = useState(null);
  const [showWeatherDetail, setShowWeatherDetail] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: -23.55, lon: -46.63 });
  const [isIdentifyingPlant, setIsIdentifyingPlant] = useState(false);
  const [newPlant, setNewPlant] = useState({
    type: 'suculenta',
    species: '',
    nickname: '',
    photo: null
  });
  const [useFirebase, setUseFirebase] = useState(false); // Toggle para usar Firebase ou SessionStorage

  // ============================================================================
  // FIREBASE AUTH LISTENER
  // ============================================================================
  // Descomente quando conectar Firebase:
  
  useEffect(() => {
    if (!useFirebase) return;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = { 
          email: firebaseUser.email, 
          uid: firebaseUser.uid 
        };
        setUser(userData);
        setShowLogin(false);
        await loadUserPlantsFromFirebase(firebaseUser.uid);
        getUserLocation();
        fetchWeather();
      } else {
        setUser(null);
        setPlants([]);
        setShowLogin(true);
      }
    });
    
    return () => unsubscribe();
  }, [useFirebase]);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('plukUser');
    const savedDarkMode = sessionStorage.getItem('plukDarkMode');
    
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
    
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setShowLogin(false);
      loadUserPlants(userData.email);
      getUserLocation();
      fetchWeather();
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('plukDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.log('Usando localizacao padrao');
        }
      );
    }
  };

  const fetchWeather = async () => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
      );
      const data = await response.json();
      setWeather(data.current);
    } catch (error) {
      console.error('Erro ao buscar clima:', error);
      setWeather({
        temperature_2m: 22,
        relative_humidity_2m: 65,
        wind_speed_10m: 12,
        weather_code: 0
      });
    }
  };

  const getWeatherDescription = (code) => {
    const descriptions = {
      0: { text: 'Ceu Limpo', icon: '☀️' },
      1: { text: 'Principalmente Limpo', icon: '🌤️' },
      2: { text: 'Parcialmente Nublado', icon: '⛅' },
      3: { text: 'Nublado', icon: '☁️' },
      45: { text: 'Neblina', icon: '🌫️' },
      48: { text: 'Neblina', icon: '🌫️' },
      51: { text: 'Garoa Leve', icon: '🌦️' },
      61: { text: 'Chuva Leve', icon: '🌧️' },
      80: { text: 'Pancadas de Chuva', icon: '⛈️' },
      95: { text: 'Tempestade', icon: '⛈️' },
    };
    return descriptions[code] || { text: 'Desconhecido', icon: '🌡️' };
  };

  const identifyPlantFromImage = async (imageData) => {
    setIsIdentifyingPlant(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const possiblePlants = [
        'Monstera deliciosa', 'Ficus elastica', 'Pothos aureus',
        'Spathiphyllum wallisii', 'Zamioculcas zamiifolia', 
        'Aloe vera', 'Sansevieria trifasciata', 'Dracaena marginata'
      ];
      const identified = possiblePlants[Math.floor(Math.random() * possiblePlants.length)];
      
      setNewPlant(prev => ({ ...prev, species: identified, photo: imageData }));
      setIsIdentifyingPlant(false);
    } catch (error) {
      console.error('Erro ao identificar planta:', error);
      setIsIdentifyingPlant(false);
    }
  };

  const searchPlantAI = async (query) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const responses = {
        'regar': 'A frequencia de rega depende do tipo de planta. Suculentas precisam de agua a cada 7-10 dias, enquanto samambaias precisam de rega a cada 2-3 dias.',
        'sol': 'A maioria das plantas precisa de 4-6 horas de luz solar indireta por dia. Cactos precisam de mais sol direto.',
        'folhas amarelas': 'Folhas amarelas podem indicar excesso de agua, falta de nutrientes ou luz inadequada.',
        'adubo': 'Use fertilizante liquido balanceado a cada 15-30 dias durante a primavera e verao.',
        'pragas': 'Para pragas comuns, use uma mistura de agua com sabao neutro. Pulverize nas folhas afetadas.',
        'default': `Sobre "${query}": Cada planta tem necessidades especificas. Verifique o tipo da sua planta para cuidados adequados.`
      };
      
      const lowerQuery = query.toLowerCase();
      let response = responses.default;
      
      for (const [key, value] of Object.entries(responses)) {
        if (lowerQuery.includes(key)) {
          response = value;
          break;
        }
      }
      
      setSearchResults(response);
    } catch (error) {
      setSearchResults('Desculpe, nao consegui processar sua pergunta.');
    } finally {
      setIsSearching(false);
    }
  };

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

  // ============================================================================
  // FIREBASE DATABASE FUNCTIONS
  // ============================================================================
  // Descomente quando conectar Firebase:
  
  const loadUserPlantsFromFirebase = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setPlants(userData.plants || []);
      }
    } catch (error) {
      console.error('Erro ao carregar plantas:', error);
    }
  };

  const savePlantsToFirebase = async (updatedPlants, uid) => {
    try {
      await setDoc(doc(db, 'users', uid), {
        plants: updatedPlants,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setPlants(updatedPlants);
    } catch (error) {
      console.error('Erro ao salvar plantas:', error);
      alert('Erro ao salvar. Tente novamente.');
    }
  };
  

  const handleLogin = () => {
    if (!loginEmail || !loginPassword) return;

    // ============================================================================
    // FIREBASE LOGIN (descomente para usar)
    // ============================================================================
    
    if (useFirebase) {
      if (isRegistering) {
        // Criar conta no Firebase
        createUserWithEmailAndPassword(auth, loginEmail, loginPassword)
          .then(async (userCredential) => {
            const firebaseUser = userCredential.user;
            
            // Salvar dados adicionais no Firestore
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              email: loginEmail,
              securityQuestion: securityQuestion || null,
              securityAnswer: securityAnswer ? securityAnswer.toLowerCase() : null,
              createdAt: new Date().toISOString(),
              plants: []
            });
            
            alert('Conta criada com sucesso!');
            setSecurityQuestion('');
            setSecurityAnswer('');
          })
          .catch((error) => {
            if (error.code === 'auth/email-already-in-use') {
              alert('Este email ja esta em uso!');
            } else if (error.code === 'auth/weak-password') {
              alert('A senha deve ter pelo menos 6 caracteres!');
            } else {
              alert('Erro ao criar conta: ' + error.message);
            }
          });
      } else {
        // Login no Firebase
        signInWithEmailAndPassword(auth, loginEmail, loginPassword)
          .catch((error) => {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
              alert('Email ou senha incorretos!');
            } else {
              alert('Erro ao fazer login: ' + error.message);
            }
          });
      }
      return;
    }
    
    // ============================================================================
    // SESSION STORAGE LOGIN (atual)
    // ============================================================================

    if (isRegistering) {
      if (!securityQuestion || !securityAnswer) {
        alert('Por favor, preencha a pergunta e resposta de seguranca!');
        return;
      }
      
      const users = JSON.parse(sessionStorage.getItem('plukUsers') || '[]');
      const existingUser = users.find(u => u.email === loginEmail);
      
      if (existingUser) {
        alert('Usuario ja existe!');
        return;
      }
      
      const newUser = { 
        email: loginEmail, 
        password: loginPassword,
        securityQuestion: securityQuestion,
        securityAnswer: securityAnswer.toLowerCase()
      };
      users.push(newUser);
      sessionStorage.setItem('plukUsers', JSON.stringify(users));
      sessionStorage.setItem('plukUser', JSON.stringify(newUser));
      setUser(newUser);
      setShowLogin(false);
      loadUserPlants(loginEmail);
      getUserLocation();
      fetchWeather();
      setSecurityQuestion('');
      setSecurityAnswer('');
    } else {
      const users = JSON.parse(sessionStorage.getItem('plukUsers') || '[]');
      const foundUser = users.find(u => u.email === loginEmail && u.password === loginPassword);
      
      if (foundUser) {
        sessionStorage.setItem('plukUser', JSON.stringify(foundUser));
        setUser(foundUser);
        setShowLogin(false);
        loadUserPlants(loginEmail);
        getUserLocation();
        fetchWeather();
      } else {
        alert('Email ou senha incorretos!');
      }
    }
  };

  const handleForgotPassword = () => {
    if (recoveryStep === 1) {
      if (!recoveryEmail) {
        alert('Digite seu email!');
        return;
      }
      
      const users = JSON.parse(sessionStorage.getItem('plukUsers') || '[]');
      const user = users.find(u => u.email === recoveryEmail);
      
      if (!user) {
        alert('Email nao encontrado!');
        return;
      }
      
      // Se o usuário não tem pergunta de segurança (usuário antigo)
      if (!user.securityQuestion) {
        setRecoveryStep(3); // Pula direto para redefinir senha
      } else {
        setRecoveryStep(2); // Vai para pergunta de segurança
      }
    } else if (recoveryStep === 2) {
      const users = JSON.parse(sessionStorage.getItem('plukUsers') || '[]');
      const user = users.find(u => u.email === recoveryEmail);
      
      if (securityAnswer.toLowerCase() !== user.securityAnswer) {
        alert('Resposta incorreta!');
        return;
      }
      
      setRecoveryStep(3);
    } else if (recoveryStep === 3) {
      if (!newPassword || newPassword.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres!');
        return;
      }
      
      const users = JSON.parse(sessionStorage.getItem('plukUsers') || '[]');
      const userIndex = users.findIndex(u => u.email === recoveryEmail);
      
      if (userIndex !== -1) {
        users[userIndex].password = newPassword;
        
        // Se for usuário antigo, aproveita para adicionar pergunta de segurança
        if (!users[userIndex].securityQuestion && securityQuestion && securityAnswer) {
          users[userIndex].securityQuestion = securityQuestion;
          users[userIndex].securityAnswer = securityAnswer.toLowerCase();
        }
        
        sessionStorage.setItem('plukUsers', JSON.stringify(users));
        alert('Senha alterada com sucesso!');
        setShowForgotPassword(false);
        setRecoveryStep(1);
        setRecoveryEmail('');
        setSecurityAnswer('');
        setNewPassword('');
        setSecurityQuestion('');
      }
    }
  };

  const handleLogout = () => {
    // ============================================================================
    // FIREBASE LOGOUT (descomente para usar)
    // ============================================================================
    
    if (useFirebase) {
      signOut(auth)
        .then(() => {
          setUser(null);
          setPlants([]);
          setShowLogin(true);
        })
        .catch((error) => {
          console.error('Erro ao fazer logout:', error);
        });
      return;
    }
    
  
    sessionStorage.removeItem('plukUser');
    setUser(null);
    setPlants([]);
    setShowLogin(true);
  };

  const handleAddPlant = () => {
    if (!newPlant.nickname) {
      alert('Por favor, de um apelido para sua planta!');
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
    
    // Use Firebase ou SessionStorage
    if (useFirebase && user.uid) {
      // savePlantsToFirebase(updatedPlants, user.uid); // Descomente quando usar Firebase
    } else {
      savePlants(updatedPlants, user.email);
    }
    
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
      alert('Digite um valor valido de horas!');
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
        identifyPlantFromImage(reader.result);
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

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-emerald-100';
  const cardClass = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800';
  const textClass = darkMode ? 'text-gray-200' : 'text-gray-700';
  const headerClass = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800';

  if (showLogin) {
    if (showForgotPassword) {
      return (
        <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
          <div className={`${cardClass} rounded-3xl shadow-2xl p-8 w-full max-w-md`}>
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-green-600 mb-2">🌱 Pluk</h1>
              <p className={textClass}>Recuperacao de Senha</p>
            </div>
            
            <div className="space-y-4">
              {recoveryStep === 1 && (
                <>
                  <div>
                    <label className={`block text-sm font-medium ${textClass} mb-2`}>Email</label>
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-transparent"
                      placeholder="seu@email.com"
                    />
                  </div>
                </>
              )}
              
              {recoveryStep === 2 && (
                <>
                  <div className={`p-4 bg-blue-50 ${darkMode ? 'bg-blue-900' : ''} rounded-lg mb-4`}>
                    <p className="text-sm font-medium">Pergunta de Seguranca:</p>
                    <p className="text-sm mt-1">
                      {JSON.parse(sessionStorage.getItem('plukUsers') || '[]').find(u => u.email === recoveryEmail)?.securityQuestion}
                    </p>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${textClass} mb-2`}>Resposta</label>
                    <input
                      type="text"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-transparent"
                      placeholder="Sua resposta"
                    />
                  </div>
                </>
              )}
              
              {recoveryStep === 3 && (
                <>
                  {!JSON.parse(sessionStorage.getItem('plukUsers') || '[]').find(u => u.email === recoveryEmail)?.securityQuestion && (
                    <div className={`p-4 bg-yellow-50 ${darkMode ? 'bg-yellow-900' : ''} rounded-lg mb-4`}>
                      <p className="text-sm">
                        ⚠️ Detectamos que sua conta e antiga. Apos redefinir sua senha, recomendamos adicionar uma pergunta de seguranca para maior protecao.
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className={`block text-sm font-medium ${textClass} mb-2`}>Nova Senha</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-transparent"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  {!JSON.parse(sessionStorage.getItem('plukUsers') || '[]').find(u => u.email === recoveryEmail)?.securityQuestion && (
                    <>
                      <div className="border-t border-gray-300 my-4"></div>
                      <p className={`text-sm font-medium ${textClass} mb-3`}>Adicionar Pergunta de Seguranca (Opcional mas Recomendado)</p>
                      
                      <div>
                        <label className={`block text-sm font-medium ${textClass} mb-2`}>Pergunta de Seguranca</label>
                        <select
                          value={securityQuestion}
                          onChange={(e) => setSecurityQuestion(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-transparent"
                        >
                          <option value="">Selecione uma pergunta (opcional)</option>
                          <option value="Qual o nome do seu primeiro animal de estimacao?">Qual o nome do seu primeiro animal de estimacao?</option>
                          <option value="Qual sua cor favorita?">Qual sua cor favorita?</option>
                          <option value="Em que cidade voce nasceu?">Em que cidade voce nasceu?</option>
                          <option value="Qual o nome da sua mae?">Qual o nome da sua mae?</option>
                          <option value="Qual sua comida favorita?">Qual sua comida favorita?</option>
                        </select>
                      </div>
                      
                      {securityQuestion && (
                        <div>
                          <label className={`block text-sm font-medium ${textClass} mb-2`}>Resposta</label>
                          <input
                            type="text"
                            value={securityAnswer}
                            onChange={(e) => setSecurityAnswer(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-transparent"
                            placeholder="Sua resposta"
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              
              <button
                onClick={handleForgotPassword}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                {recoveryStep === 3 ? 'Alterar Senha' : 'Continuar'}
              </button>
              
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setRecoveryStep(1);
                  setRecoveryEmail('');
                  setSecurityAnswer('');
                  setNewPassword('');
                }}
                className="w-full text-green-600 py-2 text-sm hover:underline"
              >
                Voltar ao Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
        <div className={`${cardClass} rounded-3xl shadow-2xl p-8 w-full max-w-md`}>
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-green-600 mb-2">🌱 Pluk</h1>
            <p className={textClass}>Cuide das suas plantas com carinho</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${textClass} mb-2`}>Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-transparent"
                placeholder="seu@email.com"
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${textClass} mb-2`}>Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            {isRegistering && (
              <>
                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>Pergunta de Seguranca</label>
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-transparent"
                  >
                    <option value="">Selecione uma pergunta</option>
                    <option value="Qual o nome do seu primeiro animal de estimacao?">Qual o nome do seu primeiro animal de estimacao?</option>
                    <option value="Qual sua cor favorita?">Qual sua cor favorita?</option>
                    <option value="Em que cidade voce nasceu?">Em que cidade voce nasceu?</option>
                    <option value="Qual o nome da sua mae?">Qual o nome da sua mae?</option>
                    <option value="Qual sua comida favorita?">Qual sua comida favorita?</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>Resposta de Seguranca</label>
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-transparent"
                    placeholder="Sua resposta"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use para recuperar sua senha no futuro</p>
                </div>
              </>
            )}
            
            <button
              onClick={handleLogin}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              {isRegistering ? 'Criar Conta' : 'Entrar'}
            </button>
            
            {!isRegistering && (
              <button
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-blue-600 py-2 text-sm hover:underline"
              >
                Esqueci minha senha
              </button>
            )}
            
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full text-green-600 py-2 text-sm hover:underline"
            >
              {isRegistering ? 'Ja tem conta? Faca login' : 'Nao tem conta? Registre-se'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <header className={`${headerClass} shadow-md p-4 sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-green-600">🌱 Pluk</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-200 transition"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <span className={`text-sm ${textClass} hidden md:flex items-center gap-2`}>
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
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchPlantAI(searchQuery)}
              placeholder="Pergunte sobre cuidados com plantas..."
              className={`w-full pl-10 pr-4 py-3 ${cardClass} border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500`}
            />
          </div>
          <button
            onClick={() => searchPlantAI(searchQuery)}
            disabled={isSearching}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {showSearchResults && (
          <div className={`${cardClass} rounded-2xl shadow-lg p-6 mb-6`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                🤖 Resposta PlantAI
              </h3>
              <button onClick={() => setShowSearchResults(false)}>
                <X size={20} />
              </button>
            </div>
            <p className={textClass}>{searchResults}</p>
          </div>
        )}

        {weather && (
          <div 
            onClick={() => setShowWeatherDetail(true)}
            className={`${cardClass} rounded-2xl shadow-lg p-6 mb-6 cursor-pointer hover:shadow-xl transition`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{getWeatherDescription(weather.weather_code).icon}</div>
                <div>
                  <h3 className="text-2xl font-bold">{Math.round(weather.temperature_2m)}°C</h3>
                  <p className={textClass}>{getWeatherDescription(weather.weather_code).text}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`${textClass} text-sm flex items-center gap-2 justify-end`}>
                  <Droplets size={16} />
                  {weather.relative_humidity_2m}%
                </p>
                <p className={`${textClass} text-sm flex items-center gap-2 justify-end mt-1`}>
                  <Wind size={16} />
                  {Math.round(weather.wind_speed_10m)} km/h
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => setShowAddPlant(true)}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition shadow-lg"
          >
            <Plus size={20} />
            Adicionar Planta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {plants.map(plant => (
            <div
              key={plant.id}
              onClick={() => setSelectedPlant(plant)}
              className={`${cardClass} rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition transform hover:scale-105`}
            >
              <div className="text-6xl text-center mb-4">{plant.icon}</div>
              <h3 className="text-xl font-bold text-center mb-4">{plant.nickname}</h3>
              
              <div className="space-y-3">
                <div className={`flex items-center justify-between ${darkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg p-3`}>
                  <div className="flex items-center gap-2">
                    <Droplets size={18} className="text-blue-600" />
                    <span className="text-sm">Regar em:</span>
                  </div>
                  <span className="font-semibold text-blue-600">
                    {formatTimeRemaining(plant.nextWater)}
                  </span>
                </div>
                
                <div className={`flex items-center justify-between ${darkMode ? 'bg-yellow-900' : 'bg-yellow-50'} rounded-lg p-3`}>
                  <div className="flex items-center gap-2">
                    <Sun size={18} className="text-yellow-600" />
                    <span className="text-sm">Sol em:</span>
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
          <div className="text-center py-20 mb-12">
            <div className="text-6xl mb-4">🌿</div>
            <h2 className={`text-2xl font-bold ${textClass} mb-2`}>Nenhuma planta ainda</h2>
            <p className={textClass}>Adicione sua primeira planta para comecar!</p>
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-green-600 mb-6">📍 Onde comprar plantas e afins:</h2>
          <div className={`${cardClass} rounded-2xl shadow-lg p-4 h-96`}>
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lon-0.05}%2C${userLocation.lat-0.05}%2C${userLocation.lon+0.05}%2C${userLocation.lat+0.05}&layer=mapnik&marker=${userLocation.lat}%2C${userLocation.lon}`}
              className="rounded-xl"
              title="Mapa de lojas"
            />
          </div>
          <p className={`${textClass} text-sm mt-2 text-center`}>
            🏪 Lojas de jardinagem proximas a voce
          </p>
        </div>
      </main>

      {showWeatherDetail && weather && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${cardClass} rounded-3xl shadow-2xl p-8 w-full max-w-md`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Detalhes do Clima</h2>
              <button onClick={() => setShowWeatherDetail(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="text-7xl mb-4">{getWeatherDescription(weather.weather_code).icon}</div>
              <h3 className="text-4xl font-bold mb-2">{Math.round(weather.temperature_2m)}°C</h3>
              <p className={textClass}>{getWeatherDescription(weather.weather_code).text}</p>
            </div>
            
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 ${darkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg`}>
                <div className="flex items-center gap-3">
                  <Droplets size={24} className="text-blue-600" />
                  <span className="font-medium">Umidade</span>
                </div>
                <span className="text-xl font-bold">{weather.relative_humidity_2m}%</span>
              </div>
              
              <div className={`flex items-center justify-between p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                <div className="flex items-center gap-3">
                  <Wind size={24} className="text-gray-600" />
                  <span className="font-medium">Vento</span>
                </div>
                <span className="text-xl font-bold">{Math.round(weather.wind_speed_10m)} km/h</span>
              </div>
              
              <div className={`p-4 ${darkMode ? 'bg-green-900' : 'bg-green-50'} rounded-lg`}>
                <p className="text-sm text-center">
                  💡 <strong>Dica:</strong> {weather.temperature_2m > 28 ? 'Dia quente! Regue suas plantas.' : weather.relative_humidity_2m > 70 ? 'Alta umidade, reduza a rega.' : 'Condicoes ideais para suas plantas!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddPlant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${cardClass} rounded-3xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Nova Planta</h2>
              <button onClick={() => setShowAddPlant(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Tipo de Planta</label>
                <select
                  value={newPlant.type}
                  onChange={(e) => setNewPlant({ ...newPlant, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-transparent"
                >
                  {Object.entries(PLANT_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.icon} {val.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>
                  Foto da Planta {isIdentifyingPlant && '(Identificando...)'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isIdentifyingPlant}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-transparent"
                />
                {newPlant.photo && (
                  <img src={newPlant.photo} alt="Preview" className="mt-2 w-full h-40 object-cover rounded-lg" />
                )}
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Especie</label>
                <input
                  type="text"
                  value={newPlant.species}
                  onChange={(e) => setNewPlant({ ...newPlant, species: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-transparent"
                  placeholder="Ex: Aloe Vera"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Apelido *</label>
                <input
                  type="text"
                  value={newPlant.nickname}
                  onChange={(e) => setNewPlant({ ...newPlant, nickname: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-transparent"
                  placeholder="Ex: Minha Plantinha"
                />
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
          <div className={`${cardClass} rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{selectedPlant.nickname}</h2>
              <button onClick={() => setSelectedPlant(null)}>
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
                  <span className="text-gray-600">Especie:</span>
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
                Ja Reguei Esta Planta
              </button>
              
              <div className="flex gap-2">
                <input
                  type="number"
                  value={sunHours}
                  onChange={(e) => setSunHours(e.target.value)}
                  placeholder="Horas"
                  step="0.5"
                  min="0"
                  className="flex-1 px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 bg-transparent"
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

export default PlukApp