package com.saleemkhan.myshopmanager.utils

data class CategoryTranslation(
    val id: String,
    val en: String,
    val ur: String
)

object Translations {
    val EXPENSE_CATEGORIES_TRANSLATED = listOf(
        CategoryTranslation("SHOP_RENT", "Shop Rent", "دکان کا کرایہ"),
        CategoryTranslation("ELECTRICITY", "Electricity Bill", "بجلی کا بل"),
        CategoryTranslation("GAS", "Gas Bill", "گیس کا بل"),
        CategoryTranslation("WATER", "Water Bill", "پانی کا بل"),
        CategoryTranslation("INTERNET", "Internet & WiFi", "انٹرنیٹ اور وائی فائی"),
        CategoryTranslation("PHONE", "Mobile / Phone Bill", "فون / موبائل بل"),
        CategoryTranslation("TRANSPORT", "Transport & Freight", "ٹرانسپورٹ اور کرایہ بھاڑا"),
        CategoryTranslation("FUEL", "Fuel / Petrol", "پیٹرول / ایندھن"),
        CategoryTranslation("SALARY", "Staff Salary", "ملازمین کی تنخواہ"),
        CategoryTranslation("TEA", "Tea & Hospitality", "چائے اور ضیافت"),
        CategoryTranslation("CLEANING", "Cleaning & Janitorial", "صفائی کے اخراجات"),
        CategoryTranslation("REPAIR", "Repair & Maintenance", "مرمت اور دیکھ بھال"),
        CategoryTranslation("MAINTENANCE", "Shop Maintenance", "دکان کی رکھ رکھاؤ"),
        CategoryTranslation("PACKAGING", "Packaging Materials", "پیکنگ سامان"),
        CategoryTranslation("COURIER", "Courier & Shipping", "ڈاک اور کوریئر"),
        CategoryTranslation("ADVERTISING", "Advertising & Flex", "اشتہار اور فلیکس Board"),
        CategoryTranslation("STATIONERY", "Stationery & Register", "سٹیشنری اور رجسٹر"),
        CategoryTranslation("PRINTING", "Printing Bills", "پرنٹنگ"),
        CategoryTranslation("PROFESSIONAL_FEE", "Accountant / Legal Fee", "وکیل / اکاؤنٹنٹ فیس"),
        CategoryTranslation("BANK_CHARGES", "Bank Charges", "بینک چارجز"),
        CategoryTranslation("POS_CHARGES", "POS Machine Fees", "POS مشین کٹوتی"),
        CategoryTranslation("MISCELLANEOUS", "Miscellaneous", "متفرق اخراجات"),
        CategoryTranslation("CUSTOM", "Custom Expense", "دیگر مخصوص خرچ")
    )

    val ASSET_TYPES_TRANSLATED = listOf(
        CategoryTranslation("FURNITURE", "Furniture & Fixtures", "فرنیچر اور کاؤنٹر"),
        CategoryTranslation("SHELVES", "Racks & Shelves", "ریک اور الماریاں"),
        CategoryTranslation("COMPUTER", "Computer / Laptop", "کمپیوٹر / لیپ ٹاپ"),
        CategoryTranslation("PRINTER_POS", "Printer / POS Machine", "پرنٹر / POS مشین"),
        CategoryTranslation("VEHICLE", "Delivery Bike / Van", "سواریاں / بائیک / وین"),
        CategoryTranslation("GENERATOR", "Generator", "جنریٹر"),
        CategoryTranslation("UPS_SOLAR", "UPS & Solar System", "یو پی ایس اور سولر سسٹم"),
        CategoryTranslation("MACHINERY", "Machinery & Tools", "مشینری اور اوزار"),
        CategoryTranslation("AC_FRIDGE", "AC & Deep Freezer", "ایئر کنڈیشنر اور ڈیپ فریزر"),
        CategoryTranslation("OTHER", "Other Business Assets", "دیگر دکان کے اثاثے")
    )

    val PERSONAL_ASSET_TYPES_TRANSLATED = listOf(
        CategoryTranslation("HOUSE", "Residential House", "رہائشی مکان"),
        CategoryTranslation("PLOT", "Plot / Land", "پلاٹ / زمین"),
        CategoryTranslation("CAR", "Car / Motor Vehicle", "گاڑی"),
        CategoryTranslation("BIKE", "Motorcycle", "موٹر سائیکل"),
        CategoryTranslation("GOLD", "Gold & Jewelry", "سونا اور زیورات"),
        CategoryTranslation("CASH_BANK", "Personal Cash / Bank", "ذاتی نقد / بینک رقم"),
        CategoryTranslation("INVESTMENTS", "Prize Bonds / Shares / Stocks", "پرائز بانڈز / پرائیویٹ سرمایہ کاری"),
        CategoryTranslation("OTHER", "Other Personal Property", "دیگر ذاتی اثاثے")
    )

    fun getCategoryLabel(id: String, isUrdu: Boolean): String {
        val found = EXPENSE_CATEGORIES_TRANSLATED.find { it.id.equals(id, ignoreCase = true) }
        return if (found != null) {
            if (isUrdu) found.ur else found.en
        } else {
            id
        }
    }
}
