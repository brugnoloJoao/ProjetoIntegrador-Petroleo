import React from 'react';
import { createRoot } from 'react-dom/client';
import ThreeBackground from './login-three-background.jsx';
import { criarBolaInversora } from './effects/bola-inversora.js';
import { sinalizarEntrada } from './effects/sinal-entrada.js';

// Efeitos só visuais: o formulário e a autenticação continuam como estão.
criarBolaInversora();
sinalizarEntrada(document.querySelector('.ps-login-form'));

const mount = document.getElementById('login-three-background');
if (mount) createRoot(mount).render(<ThreeBackground />);
