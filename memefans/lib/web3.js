class PublicKey {
  constructor(value) {
    if (typeof value === 'string') {
      this._bn = this._decode(value);
    } else if (value instanceof Uint8Array) {
      this._bn = value;
    } else {
      throw new Error('Invalid public key input');
    }
  }

  _decode(address) {
    const decoded = base58.decode(address);
    if (decoded.length !== 32) {
      throw new Error('Invalid public key length');
    }
    return decoded;
  }

  equals(other) {
    return this.toBase58() === other.toBase58();
  }

  toBase58() {
    return base58.encode(this._bn);
  }

  toBytes() {
    return this._bn;
  }

  toString() {
    return this.toBase58();
  }
}

class Transaction {
  constructor() {
    this.instructions = [];
    this.recentBlockhash = null;
    this.feePayer = null;
    this._signatures = new Set();
  }

  add(instruction) {
    this.instructions.push(instruction);
  }

  sign(...signers) {
    signers.forEach(signer => {
      this._signatures.add(signer.publicKey.toBase58());
    });
  }

  serialize() {
    // 简化的序列化实现
    return Buffer.from(JSON.stringify({
      instructions: this.instructions,
      recentBlockhash: this.recentBlockhash,
      feePayer: this.feePayer ? this.feePayer.toBase58() : null,
      signatures: Array.from(this._signatures)
    }));
  }
}

class TransactionInstruction {
  constructor(opts) {
    this.keys = opts.keys;
    this.programId = opts.programId;
    this.data = opts.data;
  }
}

class Connection {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  async getBalance(publicKey) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [publicKey.toString()],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result.value;
  }

  async getBlockHeight() {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBlockHeight',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result;
  }
}

class Keypair {
  constructor(secretKey) {
    this.secretKey = secretKey;
    this.publicKey = new PublicKey(secretKey.slice(32));
  }

  static generate() {
    const secretKey = new Uint8Array(64);
    crypto.getRandomValues(secretKey);
    return new Keypair(secretKey);
  }

  static fromSecretKey(secretKey) {
    if (secretKey.length !== 64) {
      throw new Error('Invalid secret key length');
    }
    return new Keypair(secretKey);
  }
}

// Base58 implementation
const base58 = {
  alphabet: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  encode: function(buffer) {
    if (buffer.length === 0) return '';
    
    const digits = [0];
    for (let i = 0; i < buffer.length; i++) {
      let carry = buffer[i];
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = (carry / 58) | 0;
      }
      while (carry > 0) {
        digits.push(carry % 58);
        carry = (carry / 58) | 0;
      }
    }

    let string = '';
    for (let i = digits.length - 1; i >= 0; i--) {
      string += this.alphabet[digits[i]];
    }

    return string;
  },
  decode: function(string) {
    if (string.length === 0) return new Uint8Array(0);
    
    const bytes = [0];
    for (let i = 0; i < string.length; i++) {
      const c = string[i];
      const value = this.alphabet.indexOf(c);
      if (value === -1) {
        throw new Error('Invalid Base58 character');
      }
      
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] *= 58;
      }
      bytes[0] += value;
      
      let carry = 0;
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] += carry;
        carry = bytes[j] >> 8;
        bytes[j] &= 0xff;
      }
      while (carry) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    
    return new Uint8Array(bytes.reverse());
  }
};

// Export the Solana Web3 objects
window.solana = {
  PublicKey,
  Transaction,
  TransactionInstruction,
  Connection,
  Keypair
};
