const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.database();

// 1. Deposit: increment balance automatically
exports.onDeposit = functions.database
  .ref("/users/{uid}/deposits/{depositId}")
  .onCreate(async (snapshot, context) => {
    const deposit = snapshot.val();
    const uid = context.params.uid;
    const amount = deposit.amount;

    if (amount > 0) {
      const balanceRef = db.ref(`/users/${uid}/balance`);
      await balanceRef.transaction(current => (current || 0) + amount);
    }
  });

// 2. Withdrawal: decrement balance safely
exports.onWithdrawal = functions.database
  .ref("/users/{uid}/withdrawals/{withdrawalId}")
  .onCreate(async (snapshot, context) => {
    const withdrawal = snapshot.val();
    const uid = context.params.uid;
    const amount = withdrawal.amount;

    if (amount > 0) {
      const balanceRef = db.ref(`/users/${uid}/balance`);
      await balanceRef.transaction(current => {
        if (!current || current < amount) {
          console.log("Insufficient balance");
          return; // cancels the transaction
        }
        return current - amount;
      });
    }
  });

// 3. Bonus / claim: increment balance automatically
exports.onBonusOrClaim = functions.database
  .ref("/users/{uid}/{type}/{id}")
  .onCreate(async (snapshot, context) => {
    const { type } = context.params;
    const data = snapshot.val();
    const uid = context.params.uid;
    const amount = data.amount;

    if ((type === "bonuses" || type === "claims") && amount > 0) {
      const balanceRef = db.ref(`/users/${uid}/balance`);
      await balanceRef.transaction(current => (current || 0) + amount);
    }
  });

// 4. Referral: increment referrer's count safely
exports.onReferral = functions.database
  .ref("/users/{uid}/referrals/{refId}")
  .onCreate(async (snapshot, context) => {
    const refUsername = snapshot.val().username;
    const refQuery = await db.ref("users").orderByChild("username").equalTo(refUsername).once("value");

    refQuery.forEach(child => {
      const refUid = child.key;
      db.ref(`/users/${refUid}/referralsCount`).transaction(current => (current || 0) + 1);
    });
  });
