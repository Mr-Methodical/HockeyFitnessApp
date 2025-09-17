// Custom hooks for Firestore operations with real-time updates
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { errorHandler } from './errorHandler';

// Generic hook for real-time document listening
export const useDocument = (collectionName, documentId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(db, collectionName, documentId);
    
    unsubscribeRef.current = onSnapshot(
      docRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setData({ id: docSnapshot.id, ...docSnapshot.data() });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error(`Error listening to ${collectionName}/${documentId}:`, error);
        setError(errorHandler.getErrorMessage(error));
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, documentId]);

  return { data, loading, error };
};

// Generic hook for real-time collection queries
export const useCollection = (collectionName, queryConstraints = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const collectionRef = collection(db, collectionName);
    const q = queryConstraints.length > 0 
      ? query(collectionRef, ...queryConstraints)
      : collectionRef;
    
    unsubscribeRef.current = onSnapshot(
      q,
      (querySnapshot) => {
        const documents = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(documents);
        setLoading(false);
      },
      (error) => {
        console.error(`Error listening to ${collectionName}:`, error);
        setError(errorHandler.getErrorMessage(error));
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, JSON.stringify(queryConstraints)]);

  return { data, loading, error };
};

// Hook for user data
export const useUser = (userId) => {
  return useDocument('users', userId);
};

// Hook for team data
export const useTeam = (teamId) => {
  return useDocument('teams', teamId);
};

// Hook for team workouts with real-time updates
export const useTeamWorkouts = (teamId, limitCount = 50) => {
  const queryConstraints = teamId ? [
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  ] : [];

  return useCollection('workouts', queryConstraints);
};

// Hook for user workouts
export const useUserWorkouts = (userId, limitCount = 50) => {
  const queryConstraints = userId ? [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  ] : [];

  return useCollection('workouts', queryConstraints);
};

// Hook for team members
export const useTeamMembers = (teamId) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!teamId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const membersRef = collection(db, 'teams', teamId, 'members');
    
    unsubscribeRef.current = onSnapshot(
      membersRef,
      async (querySnapshot) => {
        try {
          const memberPromises = querySnapshot.docs.map(async (memberDoc) => {
            const memberData = memberDoc.data();
            
            // Fetch user details for each member
            const userRef = doc(db, 'users', memberData.userId);
            const userSnap = await getDoc(userRef);
            
            return {
              id: memberDoc.id,
              ...memberData,
              userDetails: userSnap.exists() ? userSnap.data() : null
            };
          });

          const membersWithDetails = await Promise.all(memberPromises);
          setMembers(membersWithDetails);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching team members:', error);
          setError(errorHandler.getErrorMessage(error));
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to team members:', error);
        setError(errorHandler.getErrorMessage(error));
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [teamId]);

  return { data: members, loading, error };
};

// Hook for paginated data loading
export const usePaginatedCollection = (collectionName, pageSize = 20) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);

  const loadInitial = useCallback(async (queryConstraints = []) => {
    setLoading(true);
    setError(null);
    
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, ...queryConstraints, limit(pageSize));
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setData(documents);
      setHasMore(querySnapshot.docs.length === pageSize);
      lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1];
    } catch (error) {
      setError(errorHandler.getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [collectionName, pageSize]);

  const loadMore = useCallback(async (queryConstraints = []) => {
    if (!hasMore || loadingMore || !lastDocRef.current) return;
    
    setLoadingMore(true);
    
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(
        collectionRef, 
        ...queryConstraints, 
        startAfter(lastDocRef.current),
        limit(pageSize)
      );
      
      const querySnapshot = await getDocs(q);
      const newDocuments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setData(prev => [...prev, ...newDocuments]);
      setHasMore(querySnapshot.docs.length === pageSize);
      lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1];
    } catch (error) {
      setError(errorHandler.getErrorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  }, [collectionName, pageSize, hasMore, loadingMore]);

  const refresh = useCallback(() => {
    lastDocRef.current = null;
    setHasMore(true);
    setData([]);
  }, []);

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    loadInitial,
    loadMore,
    refresh
  };
};

// Hook for Firestore connection status
export const useFirestoreConnection = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen for connection state changes
    const testRef = doc(db, '__connection_test__', 'test');
    
    const unsubscribe = onSnapshot(
      testRef,
      () => {
        setIsConnected(true);
        setError(null);
      },
      (error) => {
        setIsConnected(false);
        setError(errorHandler.getErrorMessage(error));
      }
    );

    return unsubscribe;
  }, []);

  return { isConnected, error };
};

export default {
  useDocument,
  useCollection,
  useUser,
  useTeam,
  useTeamWorkouts,
  useUserWorkouts,
  useTeamMembers,
  usePaginatedCollection,
  useFirestoreConnection
};
