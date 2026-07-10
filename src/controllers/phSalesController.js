const PhSales = require("../models/phSalesModel");

// ---------------------------------user side -------------------------------------------

// Get logged-in user's purchase history
exports.getMySales = async (req, res) => {

    try {

        const user_id = req.user.id;

        const sales = await PhSales.find(
    { user_id },
    "_id total_items total_quantity total_price sold_at"
).sort({ sold_at: -1 });
        return res.status(200).json({

            success: true,

            total_sales: sales.length,

            sales

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch purchase history.",

            error: error.message

        });

    }

};

// Get logged-in user's sale details
exports.getMySaleDetails = async (req, res) => {

    try {

        const user_id = req.user.id;

        const { sale_id } = req.params;

        const sale = await PhSales.findOne(
    {
        _id: sale_id,
        user_id
    },
    "-__v -createdAt -updatedAt"
);

        if (!sale) {

            return res.status(404).json({

                success: false,

                message: "Sale not found."

            });

        }

        return res.status(200).json({

            success: true,

            sale

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch sale details.",

            error: error.message

        });

    }

};

// -------------------------------------pharmacy side -------------------------------------------

// Get all pharmacy sales (Pharmacist)
exports.getAllSales = async (req, res) => {

    try {

        const sales = await PhSales.find(
            {},
            "_id user_id total_items total_quantity total_price sold_at"
        )
        .sort({ sold_at: -1 });

        return res.status(200).json({

            success: true,

            total_sales: sales.length,

            sales

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch pharmacy sales.",

            error: error.message

        });

    }

};

// Get sale details (Pharmacist)
exports.getSaleDetails = async (req, res) => {

    try {

        const { sale_id } = req.params;

        const sale = await PhSales.findOne({
    _id: sale_id
});
        if (!sale) {

            return res.status(404).json({

                success: false,
                message: "Sale not found."

            });

        }

        return res.status(200).json({

            success: true,
            sale

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,
            message: "Failed to fetch sale details.",
            error: error.message

        });

    }

};

// ------------------------------------admin side ---------------------------------------------------

// Get pharmacy sales statistics
exports.getSalesStatistics = async (req, res) => {

    try {

        const totalSales = await PhSales.countDocuments();

        const sales = await PhSales.find();

        let totalRevenue = 0;
        let totalMedicinesSold = 0;

        sales.forEach(sale => {

            totalRevenue += sale.total_price;
            totalMedicinesSold += sale.total_quantity;

        });

        const averageOrderValue =
            totalSales > 0
                ? Number((totalRevenue / totalSales).toFixed(2))
                : 0;

        // Today's sales
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);

        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaySales = await PhSales.find({

            sold_at: {

                $gte: today,

                $lt: tomorrow

            }

        });

        const todayTotalSales = todaySales.length;

        let todayRevenue = 0;

        todaySales.forEach(sale => {

            todayRevenue += sale.total_price;

        });

        return res.status(200).json({

            success: true,

            statistics: {

                total_sales: totalSales,

                total_revenue: totalRevenue,

                total_medicines_sold: totalMedicinesSold,

                average_order_value: averageOrderValue,

                today_sales: todayTotalSales,

                today_revenue: todayRevenue

            }

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch sales statistics.",

            error: error.message

        });

    }

};

// Monthly Sales Report
exports.getMonthlySalesReport = async (req, res) => {

    try {

     const report = await PhSales.aggregate([

    {
        $group: {

            _id: {

                year: { $year: "$sold_at" },

                month: { $month: "$sold_at" }

            },

            total_sales: { $sum: 1 },

            total_revenue: { $sum: "$total_price" },

            total_quantity: { $sum: "$total_quantity" }

        }

    },

    {
        $project: {

            _id: 0,

            year: "$_id.year",

            month_number: "$_id.month",

            month: {

                $arrayElemAt: [

                    [
                        "",
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December"
                    ],

                    "$_id.month"

                ]

            },

            total_sales: 1,

            total_revenue: 1,

            total_quantity: 1

        }

    },

    {

        $sort: {

            year: -1,

            month_number: -1

        }

    }

]);

        return res.status(200).json({

            success: true,

            total_months: report.length,

            report

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to generate monthly report.",

            error: error.message

        });

    }

};

// Get top selling medicines
exports.getTopSellingMedicines = async (req, res) => {

    try {

        const medicines = await PhSales.aggregate([

            {
                $unwind: "$items"
            },

            {
                $group: {

                    _id: "$items.medicine_id",

                    medicine_name: {
                        $first: "$items.medicine_name"
                    },

                    total_quantity_sold: {
                        $sum: "$items.quantity"
                    },

                    total_revenue: {
                        $sum: "$items.subtotal"
                    }

                }

            },

            {
                $sort: {

                    total_quantity_sold: -1

                }

            },

            {
                $project: {

                    _id: 0,

                    medicine_id: "$_id",

                    medicine_name: 1,

                    total_quantity_sold: 1,

                    total_revenue: 1

                }

            }

        ]);

        return res.status(200).json({

            success: true,

            total_medicines: medicines.length,

            medicines

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch top selling medicines.",

            error: error.message

        });

    }

};

// Get sale invoice
exports.getSaleInvoice = async (req, res) => {

    try {

        const { sale_id } = req.params;

        const sale = await PhSales.findOne({

            _id: sale_id

        });

        if (!sale) {

            return res.status(404).json({

                success: false,

                message: "Sale not found."

            });

        }

        return res.status(200).json({

            success: true,

            invoice: {

                invoice_no: sale._id,

                customer_name: sale.user_name,

                pharmacist_name: sale.pharmacist_name,

                payment_method: sale.payment_method,

                sold_at: sale.sold_at,

                items: sale.items,

                total_items: sale.total_items,

                total_quantity: sale.total_quantity,

                total_price: sale.total_price

            }

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: "Failed to fetch invoice.",

            error: error.message

        });

    }

};

