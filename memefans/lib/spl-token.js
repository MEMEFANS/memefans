// SPL Token library
(function() {
  let TOKEN_PROGRAM_ID;
  let ASSOCIATED_TOKEN_PROGRAM_ID;

  function initialize() {
    if (!window.solanaWeb3) {
      console.error('solanaWeb3 not loaded');
      return;
    }
    TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    ASSOCIATED_TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  }

  async function getAssociatedTokenAddress(
    mint,
    owner,
    allowOwnerOffCurve = false,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
  ) {
    if (!TOKEN_PROGRAM_ID) {
      initialize();
    }

    if (!allowOwnerOffCurve && !window.solanaWeb3.PublicKey.isOnCurve(owner.toBuffer())) {
      throw new Error('Owner must be on curve');
    }

    const [address] = await window.solanaWeb3.PublicKey.findProgramAddress(
      [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
      associatedTokenProgramId
    );

    return address;
  }

  async function getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    owner,
    allowOwnerOffCurve = false,
    commitment = 'recent',
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
  ) {
    if (!TOKEN_PROGRAM_ID) {
      initialize();
    }

    const associatedToken = await getAssociatedTokenAddress(
      mint,
      owner,
      allowOwnerOffCurve,
      programId,
      associatedTokenProgramId
    );

    // 检查账户是否存在
    const account = await connection.getAccountInfo(associatedToken);

    if (!account) {
      // 如果账户不存在，创建它
      const transaction = new window.solanaWeb3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          associatedToken,
          owner,
          mint,
          programId,
          associatedTokenProgramId
        )
      );

      await window.solanaWeb3.sendAndConfirmTransaction(connection, transaction, [payer]);
    }

    return associatedToken;
  }

  function createAssociatedTokenAccountInstruction(
    payer,
    associatedToken,
    owner,
    mint,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
  ) {
    if (!TOKEN_PROGRAM_ID) {
      initialize();
    }

    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: window.solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
      { pubkey: window.solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];

    return new window.solanaWeb3.TransactionInstruction({
      keys,
      programId: associatedTokenProgramId,
      data: Buffer.alloc(0),
    });
  }

  // 导出到全局作用域
  window.splToken = {
    initialize,
    TOKEN_PROGRAM_ID: () => TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID: () => ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    getOrCreateAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction,
  };
})();
