
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth, db } from '../firebase/config';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  register: (nome: string, email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isPendingApproval: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            const userData = { id: fbUser.uid, ...userDoc.data() } as User;
            setUser(userData);
            setIsPendingApproval(!userData.ativo);
          } else {
            // Caso o auth exista mas o doc ainda não esteja pronto
            setIsPendingApproval(true);
          }
        } catch (error) {
          console.error("Erro ao carregar perfil:", error);
          setIsPendingApproval(true);
        }
      } else {
        setUser(null);
        setIsPendingApproval(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        if (!userData.ativo) {
          setIsPendingApproval(true);
          return { success: true };
        }
        return { success: true };
      }
      return { success: false, message: "Perfil não configurado." };
    } catch (error: any) {
      let message = "Erro ao entrar.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "E-mail ou senha incorretos.";
      }
      return { success: false, message };
    }
  };

  const register = async (nome: string, email: string, pass: string) => {
    try {
      // 1. Verificar se existem usuários cadastrados (limitado a 1 para performance)
      const usersRef = collection(db, "users");
      const q = query(usersRef, limit(1));
      const querySnapshot = await getDocs(q);
      const isFirstUser = querySnapshot.empty;

      // 2. Criar credencial no Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      
      // 3. Definir perfil baseado na ordem de chegada
      const newUser: Omit<User, 'id'> = {
        nome,
        email: email.toLowerCase(),
        role: isFirstUser ? 'admin' : 'aluno', // Primeiro é Admin
        ativo: isFirstUser ? true : false,     // Primeiro já entra ativo
        turmas: []
      };
      
      // 4. Salvar documento no Firestore
      await setDoc(doc(db, "users", result.user.uid), newUser);
      
      // 5. Ajustar estado imediato para navegação
      setIsPendingApproval(!newUser.ativo);
      
      return { success: true };
    } catch (error: any) {
      let message = "Erro ao criar conta.";
      if (error.code === 'auth/email-already-in-use') message = "Este e-mail já está em uso.";
      if (error.code === 'auth/weak-password') message = "A senha deve ter pelo menos 6 caracteres.";
      return { success: false, message };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setIsPendingApproval(false);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, login, register, logout, isLoading, isPendingApproval }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
