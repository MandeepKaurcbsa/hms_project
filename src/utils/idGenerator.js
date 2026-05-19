const Counter = require("../models/counterModel")

const generateCustomId = async (sequenceId, entityPrefix, subPrefix = "", paddingLength = 3) => {
    try {
        const counter = await Counter.findOneAndUpdate(
            { _id: sequenceId },
            { $inc: { seq: 1 } },
            { 
                // CHANGE THIS LINE: Replace new: true with the modern option
                returnDocument: "after", 
                upsert: true 
            }
        );

        const zeroPaddedSeq = String(counter.seq).padStart(paddingLength, "0");
        
        return subPrefix 
            ? `${entityPrefix}-${subPrefix.toUpperCase()}-${zeroPaddedSeq}`
            : `${entityPrefix}-${zeroPaddedSeq}`;
    } catch (error) {
        throw new Error(`Custom ID Generation Failed for ${sequenceId}: ${error.message}`);
    }
};

module.exports = generateCustomId;