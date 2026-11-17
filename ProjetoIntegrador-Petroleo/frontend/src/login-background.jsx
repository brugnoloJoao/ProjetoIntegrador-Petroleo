import React from 'react';
import { createRoot } from 'react-dom/client';
import ThreeBackground from './login-three-background.jsx';

const mount = document.getElementById('login-three-background');
if (mount) createRoot(mount).render(<ThreeBackground />);
