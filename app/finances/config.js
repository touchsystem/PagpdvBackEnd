exports.createDocumentsToPay = function(amount, accountNumber) {
    var settings = {};
    settings = {
        passive: {
            debitAmount: 0,
            creditAmount: amount,
            accountNumber: "211101" // Fijo
        },
        active: {
            debitAmount: amount,
            creditAmount: 0,
            accountNumber: accountNumber
        }
    }
    return settings;
}

exports.counterpartDocumentsToPay = function(amount, accountNumber) {
    var settings = {};
    settings = {
        passive: {
            debitAmount: amount,
            creditAmount: 0,
            accountNumber: "211101" // Fijo
        },
        active: {
            debitAmount: 0,
            creditAmount: amount,
            accountNumber: accountNumber
        }
    }
    return settings;
}

exports.createDocumentsToReceive = function(amount, accountNumber) {
    var settings = {};
    settings = {
        active: {
            debitAmount: amount,
            creditAmount: 0,
            accountNumber: "112101" // Fijo
        },
        passive: {
            debitAmount: 0,
            creditAmount: amount,
            accountNumber: accountNumber
        }
    }
    return settings;
}

// Pagos 

exports.payDocumentsToPay = function(amount, accountNumber) {
    var settings = {};
    settings = {
        passive: {
            debitAmount: 0,
            creditAmount: amount,
            accountNumber: accountNumber
        },
        active: {
            debitAmount: amount,
            creditAmount: 0,
            accountNumber: "211101"
        }
    }
    return settings;
}

exports.payDocumentsToReceive = function(amount, accountNumber) {
    var settings = {};
    settings = {
        active: {
            debitAmount: amount,
            creditAmount: 0,
            accountNumber: accountNumber
        },
        passive: {
            debitAmount: 0,
            creditAmount: amount,
            accountNumber: "112101"
        }
    }
    return settings;
}

exports.providerSplittedPaySettings = function(amount, accountNumber) {
    var settings = {};
    settings = {
        active: {
            debitAmount: amount,
            creditAmount: 0,
            accountNumber: "211101"
        },
        passive: {
            debitAmount: 0,
            creditAmount: amount,
            accountNumber: accountNumber
        }
    };
    return settings;
}

exports.customerSplittedPaySettings = function(amount, accountNumber) {
    var settings = {};
    settings = {
        active: {
            debitAmount: amount,
            creditAmount: 0,
            accountNumber: "112101" // cliente
        },
        pasive: {
            debitAmount: 0,
            creditAmount: amount,
            accountNumber: accountNumber
        }
    }
    return settings;
}

exports.toReceiveIncrementSettings = function(amount, accountNumber) {
    var settings = {};
    settings = {
        active: {
            debitAmount: amount,
            creditAmount: 0,
            accountNumber: accountNumber
        },
        passive: {
            debitAmount: 0,
            creditAmount: amount,
            accountNumber: "114101"
        }
    }
    return settings;
}

exports.toReceiveDiscountSettings = function(amount, accountNumber) {
    var settings = {};
    // Primero credito (Pasivo), luego debito (Activo)
    settings = {
        passive: {
            debitAmount: 0,
            creditAmount: amount,
            accountNumber: accountNumber
        },
        active: {
            debitAmount: amount,
            creditAmount: 0,
            accountNumber: "331106"
        }
    }
    return settings;
}

exports.toPayIncrementSettings = function(amount, accountNumber){
    var settings = {};
    settings = {
        // Primero credito (Pasivo), luego debito (Activo)
        passive: {
            debitAmount: 0,
            creditAmount: amount,
            accountNumber: accountNumber
        },
        active: {
            debitAmount: amount,
            creditAmount: 0,
            accountNumber: "331106"
        }
    };
    return settings;
}

exports.toPayDiscountSettings = function(discountAmount, accountNumber){
    var settings = {};
    // Primero debito (activo), segundo credito (pasivo)
    settings = {
        active: {
          debitAmount: discountAmount,
          creditAmount: 0,
          accountNumber: accountNumber
        },
        passive: {
          debitAmount: 0,
          creditAmount: discountAmount,
          accountNumber: "312201"
        }
    };
    return settings;
}
