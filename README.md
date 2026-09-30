# 🌟 CodeNames dos Iluminados

Plataforma online multiplayer em tempo real inspirada no clássico **[Codenames.game](https://codenames.game/)**, desenvolvida sob medida para a Tropa dos Iluminados, com suporte completo a baralhos personalizados sem limites de caracteres, sistema anti-cheat autoritativo no servidor e estética moderna.

---

## 🎮 Como Iniciar o Jogo

O servidor já está configurado. Para iniciar a qualquer momento:

```bash
npm start
```

Acesse no navegador:
👉 **[http://localhost:3333](http://localhost:3333)**

Para jogar com seus amigos em outras casas/celulares:
1. Abra um túnel rápido gratuito como **ngrok** (`ngrok http 3333`) ou **Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:3333`), ou
2. Compartilhe o link do IP da sua rede local (para quem estiver na mesma casa/Wi-Fi).

---

## 🃏 Decks de Palavras Inclusos

1. **Iluminados 🌟 (76 cartas):**
   * Apelidos, pérolas e memes da tropa: *Duende, Paulo, Hericka, Leite, Ordem, Tropa, Shrek, Sol, Vaporeon, São Matheus, Urubu, Afronésia, Judas, Cabo Frio, Pardo, Bardo, CEO, Honda, Parça, Joaverson, Zekky, Alvin e os Esquilos, Rolê, Oudrikandralarrai, I.A, Portaria, Rato, Loira, Gay, Miopia, Pobreza, Anticristo, Tição, Pneu, Canhão, Kowalski, Terceiramente, Relatório, Brunes, Carlos Edu, Pedro, Esther, Laís, Vicky, Bea, Antônio, J3, Melo, Exu, Zé Pilantra, Tai Lung, Scar, Fiona, Rasengan, Genki Dama, 7 Minutos, Australopiteco, Dona Honda, Serasa, Cellbit, Streaming, Manteiga, Santo Berço, Suvaco Seco, Calamidade, Diabo, Sumarense, Miojo com Salsicha, CLT, De Maluco, Lapa, Macumba, Corinthians, Emilly, Baranga, Downy*.
2. **Geral 🌍 (118 cartas):**
   * O vocabulário clássico e balanceado do jogo original (substantivos e conceitos diversos).
3. **+18 (Undercover) 🔞 (77 cartas):**
   * Picante, ousado e sem filtros para partidas descontraídas.
4. **Difíceis 🧠 (68 cartas):**
   * Conceitos abstratos, filosóficos, científicos e complexos de correlacionar (*Entropia, Paradoxo, Solipsismo, Quântico, Efêmero, Nihilismo, Buraco Negro...*).
5. **Imbecilidades 🤡 (52 cartas):**
   * Caos puro, situações idiotas e brainrot (*Calvo aos 18, Chute no saco, Monociclo, Pato de borracha, Peido molhado, Capivara agiota, Dança da motinha...*).
6. **Decks Personalizados do Usuário 📁:**
   * Qualquer jogador pode criar novos baralhos colando palavras ou frases (sem limite de tamanho).
   * Salvos automaticamente no navegador e com botão de **Exportar/Importar JSON** para compartilhar listas entre amigos!

---

## 🛡️ Arquitetura e Engenharia de Segurança

* **Servidor Autoritativo com WebSockets (Socket.IO):** O servidor valida todas as jogadas, alternância de turnos, contadores de palpites e timers.
* **Anti-Cheat Nativo (Data Masking):** Clientes de Agentes e Espectadores recebem o array com `type: null` em cartas ocultas. É impossível abrir o DevTools (F12) e descobrir as cores secretas!
* **Gabarito Protegido:** Apenas os Capitães (*Spymasters*) recebem a matriz secreta de cores, com botão de segurança com toggle.
* **Pings & Votos em Tempo Real:** Agentes podem clicar com o botão direito ou segurar Shift em uma carta para sugerir seu palpite com uma ficha flutuante antes da confirmação final.
* **Efeitos Sonoros Sintetizados (Web Audio API):** Áudio 100% responsivo e autônomo, sem travamento de carregamento de arquivos externos.
