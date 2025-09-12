const mongoose = require("mongoose");

const Subscriptions = require("../models/subscriptions");

async function refreshUsageCount() {
  try {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL is not provided");
    }

    await mongoose.connect(process.env.MONGO_URL);

    const usersCol = mongoose.connection.db.collection("users");

    const preUsers = await usersCol
      .find({}, { projection: { password: 0 } })
      .toArray();
    const preSubscriptions = await Subscriptions.find({}).lean();

    console.log("All users (before update):");
    console.log(JSON.stringify(preUsers, null, 2));
    console.log("All subscriptions (before update):");
    console.log(JSON.stringify(preSubscriptions, null, 2));

    const filter = {
      is_active: true,
      updated_at: { $lte: oneMonthAgo },
    };

    const updateResult = await Subscriptions.updateMany(filter, {
      usage_count: 0,
      updated_at: now,
    });

    console.log("Update result:");
    console.log(JSON.stringify(updateResult, null, 2));

    const postUsers = await usersCol
      .find({}, { projection: { password: 0 } })
      .toArray();
    const postSubscriptions = await Subscriptions.find({}).lean();

    console.log("All users (after update):");
    console.log(JSON.stringify(postUsers, null, 2));
    console.log("All subscriptions (after update):");
    console.log(JSON.stringify(postSubscriptions, null, 2));
  } catch (error) {
    console.error("Error refreshing usage count:", error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
}

if (require.main === module) {
  refreshUsageCount()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = refreshUsageCount;
