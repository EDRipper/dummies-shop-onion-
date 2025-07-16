class SymmetricEncryption {
	private readonly algorithm: string = 'AES-GCM';
	private readonly keyLength: number = 256;
	private readonly ivLength: number = 12;

	constructor() {}

	private async deriveKey(password: string): Promise<CryptoKey> {
		const encoder: TextEncoder = new TextEncoder();
		const keyMaterial: CryptoKey = await crypto.subtle.importKey(
			'raw',
			encoder.encode(password),
			{ name: 'PBKDF2' },
			false,
			['deriveBits', 'deriveKey']
		);

		const salt: Uint8Array = encoder.encode('symmetric-encryption-salt');

		return await crypto.subtle.deriveKey(
			{
				name: 'PBKDF2',
				salt: salt,
				iterations: 100000,
				hash: 'SHA-256'
			},
			keyMaterial,
			{ name: this.algorithm, length: this.keyLength },
			false,
			['encrypt', 'decrypt']
		);
	}

	async encrypt(plaintext: string, password: string): Promise<string> {
		try {
			if (!plaintext || typeof plaintext !== 'string') {
				throw new Error('Invalid input: plaintext must be a non-empty string');
			}
			if (!password || typeof password !== 'string') {
				throw new Error('Invalid input: password must be a non-empty string');
			}

			const encoder: TextEncoder = new TextEncoder();
			const key: CryptoKey = await this.deriveKey(password);
			const iv: Uint8Array = crypto.getRandomValues(new Uint8Array(this.ivLength));

			const encryptedData: ArrayBuffer = await crypto.subtle.encrypt(
				{
					name: this.algorithm,
					iv: iv
				},
				key,
				encoder.encode(plaintext)
			);

			const combined: Uint8Array = new Uint8Array(iv.length + encryptedData.byteLength);
			combined.set(iv);
			combined.set(new Uint8Array(encryptedData), iv.length);

			return btoa(String.fromCharCode(...combined));
		} catch (error: any) {
			throw new Error(`Encryption failed: ${error.message}`);
		}
	}

	async decrypt(encryptedData: string, password: string): Promise<string> {
		try {
			if (!encryptedData || typeof encryptedData !== 'string') {
				throw new Error('Invalid input: encryptedData must be a non-empty string');
			}
			if (!password || typeof password !== 'string') {
				throw new Error('Invalid input: password must be a non-empty string');
			}

			let combined: Uint8Array;
			try {
				const binaryString: string = atob(encryptedData);
				combined = new Uint8Array(binaryString.length);
				for (let i: number = 0; i < binaryString.length; i++) {
					combined[i] = binaryString.charCodeAt(i);
				}
			} catch (error: any) {
				throw new Error('Invalid encrypted data format: not valid base64');
			}

			if (combined.length <= this.ivLength) {
				throw new Error('Invalid encrypted data: data too short');
			}

			const iv: Uint8Array = combined.slice(0, this.ivLength);
			const encrypted: Uint8Array = combined.slice(this.ivLength);

			const key: CryptoKey = await this.deriveKey(password);

			const decryptedData: ArrayBuffer = await crypto.subtle.decrypt(
				{
					name: this.algorithm,
					iv: iv
				},
				key,
				encrypted
			);

			const decoder: TextDecoder = new TextDecoder();
			return decoder.decode(decryptedData);
		} catch (error: any) {
			if (error.name === 'OperationError' || error.message.includes('decrypt')) {
				throw new Error('Decryption failed: invalid password or corrupted data');
			}
			throw new Error(`Decryption failed: ${error.message}`);
		}
	}
}

export const symmetric = new SymmetricEncryption();
