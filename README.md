# 🔐 Diffie-Hellman Interactive Simulator

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Motion](https://img.shields.io/badge/Motion-black?style=for-the-badge&logo=framer&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

An educational and interactive web-based simulator to visualize the Diffie-Hellman Key Exchange algorithm and Man-in-the-Middle (MitM) attacks.

## 🌟 About The Project

Diffie-Hellman Key Exchange is a fundamental protocol in cryptography that allows two parties to establish a shared secret key over an insecure channel. This simulator provides a visual, step-by-step breakdown of the process, making it easier to understand the mathematical flow and security implications.

### Key Features:

*   **Mode 1: Basic DH (Unauthenticated):** Demonstrates successful key exchange and how an active Interceptor (Eve) can successfully perform a Man-in-the-Middle attack by spoofing public keys.
*   **Mode 2: Authenticated DH (Digital Signature):** Demonstrates how digital signatures prevent MitM attacks by allowing Alice and Bob to verify the origin and integrity of the exchanged keys.
*   **Pausable Simulation:** Full control over the simulation with Play/Pause functionality. The data packets freeze exactly where they are when paused, allowing for detailed explanation.
*   **Adjustable Speed Control:** Simulate at speeds from 0.1x (highly detailed) to 1.5x (normal flow).
*   **Interactive Messaging:** A live secure messaging simulator that unlocks only after a successful key exchange. Visualize encryption, transmission, and decryption in real-time.

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 | State management and interactive UI components |
| **Styling** | Tailwind CSS 4 | Clean, modern "White Theme" aesthetics |
| **Animation** | Motion (Framer) | Smooth, pausable data packet transitions and UI effects |
| **Icons** | Lucide React | Modern and consistent visual language |
| **Build Tool** | Vite | Fast development environment and optimized builds |

---

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v18 or higher)
*   **npm**

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/irfanwk/Diffie-Hellman-Simulation.git
    ```
2.  **Navigate to the project directory**
    ```bash
    cd Diffie-Hellman-Simulation
    ```
3.  **Install dependencies**
    ```bash
    npm install
    ```
4.  **Run the development server**
    ```bash
    npm run dev
    ```
5.  **Open in browser**
    Visit `http://localhost:3000` to interact with the simulator.

---

## 🧠 Cryptographic Logic

The simulator uses standard Diffie-Hellman arithmetic with accessible numbers for educational clarity:

> **Mathematical Concepts Applied:**
> *   **Public Parameters:** $g$ (Base, default: 3), $p$ (Modulus, default: 17)
> *   **Private Keys:** Alice ($a=15$), Bob ($b=13$)
> *   **Public Key Calculation:**
>     *   Alice: $A = g^a \pmod p$
>     *   Bob: $B = g^b \pmod p$
> *   **Shared Secret Calculation:**
>     *   Alice: $S = B^a \pmod p$
>     *   Bob: $S = A^b \pmod p$
> *   **Security:** $g^a \pmod p$ is easy to calculate, but finding $a$ given $A$ is computationally hard (Discrete Logarithm Problem).

---