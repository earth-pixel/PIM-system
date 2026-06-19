"""
Marketplace Mass Upload Exporter Module
---------------------------------------
A modular, production-ready Python script to transform product information from a PIM database
and export it into Shopee, Lazada, and TikTok Shop Excel templates while preserving 
original templates' data validations, formatting, styles, and configurations.

Requirements:
    - pandas >= 1.5.0
    - openpyxl >= 3.0.0
"""

import os
import logging
from typing import List, Dict, Any, Union, Optional
import pandas as pd
import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

# Set up logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("MarketplaceExporter")


class MarketplaceExporter:
    """
    Handles PIM database data ingestion, transformation, and template-based export 
    for major Southeast Asian e-commerce marketplaces: Shopee, Lazada, and TikTok Shop.
    """

    def __init__(self, data: Union[List[Dict[str, Any]], pd.DataFrame]):
        """
        Initializes the exporter with raw product data.

        Args:
            data: Product records from the PIM database (list of dicts or Pandas DataFrame).
        """
        if isinstance(data, pd.DataFrame):
            self.df = data.copy()
        elif isinstance(data, list):
            self.df = pd.DataFrame(data)
        else:
            raise ValueError("Input data must be a list of dictionaries or a pandas DataFrame.")
        
        self._normalize_data()

    def _normalize_data(self):
        """Standardizes input column types and formats."""
        required_fields = ["product_id", "product_name", "price", "stock", "category"]
        for field in required_fields:
            if field not in self.df.columns:
                raise ValueError(f"Required PIM database field '{field}' is missing from input data.")

        # Ensure image_urls is a list
        if "image_urls" in self.df.columns:
            self.df["image_urls"] = self.df["image_urls"].apply(
                lambda x: x if isinstance(x, list) else ([url.strip() for url in str(x).split(",")] if pd.notna(x) else [])
            )
        else:
            self.df["image_urls"] = [[] for _ in range(len(self.df))]

        # Ensure options (variants) is a dict or list of dicts
        if "options" not in self.df.columns:
            self.df["options"] = None

        # Standardize numeric values
        self.df["price"] = pd.to_numeric(self.df["price"], errors="coerce").fillna(0.0)
        self.df["stock"] = pd.to_numeric(self.df["stock"], errors="coerce").fillna(0).astype(int)
        if "weight_kg" in self.df.columns:
            self.df["weight_kg"] = pd.to_numeric(self.df["weight_kg"], errors="coerce").fillna(0.0)
        else:
            self.df["weight_kg"] = 0.0

    def _load_template(self, template_path: str) -> openpyxl.Workbook:
        """Loads excel template safely."""
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template file not found at: {template_path}")
        logger.info("Loading template file from %s", template_path)
        return openpyxl.load_workbook(template_path, keep_vba=True)

    def _find_header_column_map(self, sheet: Worksheet, header_row: int, keywords_map: Dict[str, List[str]]) -> Dict[str, int]:
        """
        Dynamically scans a header row to match template column headers with our mapped keys.

        Args:
            sheet: openpyxl worksheet object.
            header_row: 1-indexed row number where the table headers reside.
            keywords_map: Dictionary mapping target keys to a list of sub-string keywords.
                          E.g. {"sku": ["sku", "รหัสสินค้า", "seller sku"]}

        Returns:
            Dictionary mapping target keys to 1-indexed column indices.
        """
        column_map = {}
        max_col = sheet.max_column
        
        # Read header row cell values
        headers = {}
        for col in range(1, max_col + 1):
            val = sheet.cell(row=header_row, column=col).value
            if val is not None:
                headers[str(val).strip().lower()] = col

        # Map using substring match
        for key, keywords in keywords_map.items():
            mapped_col = None
            for title, col_idx in headers.items():
                if any(kw.lower() in title for kw in keywords):
                    mapped_col = col_idx
                    break
            
            if mapped_col:
                column_map[key] = mapped_col
            else:
                logger.warning("Could not match column header for keyword key: %s (looked for %s)", key, keywords)

        return column_map

    def _explode_variants(self, row: pd.Series) -> List[Dict[str, Any]]:
        """
        Explodes a product row based on its variation options.
        Shopee and TikTok support variations. If no options exist, yields a single row structure.
        """
        options = row["options"]
        # If no options, return a dummy variation representing the product itself
        if not options or not isinstance(options, list) or len(options) == 0:
            return [{
                "var_sku": row["product_id"],
                "var_price": row["price"],
                "var_stock": row["stock"],
                "var_1_name": "", "var_1_val": "",
                "var_2_name": "", "var_2_val": ""
            }]

        exploded = []
        # Option structure example: [{"name": "Color", "values": ["Red", "Blue"]}, {"name": "Size", "values": ["S", "M"]}]
        opt1 = options[0]
        opt2 = options[1] if len(options) > 1 else None

        opt1_name = opt1.get("name", "Variation 1")
        for val1 in opt1.get("values", []):
            if opt2:
                opt2_name = opt2.get("name", "Variation 2")
                for val2 in opt2.get("values", []):
                    # Construct composite SKU
                    sku = f"{row['product_id']}-{val1}-{val2}"
                    exploded.append({
                        "var_sku": sku,
                        # Variants can default to parent price/stock or contain variant-specific values
                        "var_price": row["price"], 
                        "var_stock": row["stock"],
                        "var_1_name": opt1_name, "var_1_val": val1,
                        "var_2_name": opt2_name, "var_2_val": val2
                    })
            else:
                sku = f"{row['product_id']}-{val1}"
                exploded.append({
                    "var_sku": sku,
                    "var_price": row["price"],
                    "var_stock": row["stock"],
                    "var_1_name": opt1_name, "var_1_val": val1,
                    "var_2_name": "", "var_2_val": ""
                })
        return exploded

    def export_to_shopee(self, template_path: str, output_path: str, header_row: int = 4, start_row: int = 5):
        """
        Appends product records to Shopee template with variant explosion & image indexing.

        Args:
            template_path: Path to the template xlsx file.
            output_path: Path where the resulting xlsx file should be saved.
            header_row: 1-indexed row number containing template header texts.
            start_row: 1-indexed row number to start writing data.
        """
        wb = self._load_template(template_path)
        sheet = wb.active  # Shopee template is typically single-sheet

        # Shopee headers mapping keywords
        keywords_map = {
            "parent_sku": ["parent sku", "รหัสสินค้าหลัก", "product sku"],
            "name": ["product name", "ชื่อสินค้า", "ชื่อผลิตภัณฑ์"],
            "desc": ["description", "รายละเอียดสินค้า", "รายละเอียด"],
            "brand": ["brand", "แบรนด์", "ยี่ห้อ"],
            "weight": ["weight", "น้ำหนัก", "weight(kg)"],
            "price": ["price", "ราคา"],
            "stock": ["stock", "คลัง", "จำนวนสต็อก"],
            "var_1_name": ["tier 1: variation name", "ชื่อตัวเลือก 1", "variation 1 name"],
            "var_1_val": ["tier 1: option", "ตัวเลือก 1", "variation 1 option"],
            "var_2_name": ["tier 2: variation name", "ชื่อตัวเลือก 2", "variation 2 name"],
            "var_2_val": ["tier 2: option", "ตัวเลือก 2", "variation 2 option"],
            "var_sku": ["variation sku", "รหัสสินค้าตัวเลือก", "sku ตัวเลือก"],
            "img_1": ["product image 1", "ภาพหน้าปก", "ภาพ 1", "cover image"],
            "img_2": ["product image 2", "ภาพ 2"],
            "img_3": ["product image 3", "ภาพ 3"],
            "img_4": ["product image 4", "ภาพ 4"],
            "img_5": ["product image 5", "ภาพ 5"],
            "img_6": ["product image 6", "ภาพ 6"],
            "img_7": ["product image 7", "ภาพ 7"],
            "img_8": ["product image 8", "ภาพ 8"],
            "img_9": ["product image 9", "ภาพ 9"],
        }

        col_map = self._find_header_column_map(sheet, header_row, keywords_map)
        
        current_row = start_row
        try:
            for _, row in self.df.iterrows():
                # Process variants
                variants = self._explode_variants(row)
                
                # Write each variant row
                for idx, var in enumerate(variants):
                    # Set parent-level values on first variant or repeat depending on requirement
                    # In Shopee mass upload, Parent SKU binds them; writing parent values on all rows is generally safe
                    if col_map.get("parent_sku"):
                        sheet.cell(row=current_row, column=col_map["parent_sku"], value=row["product_id"])
                    if col_map.get("name"):
                        sheet.cell(row=current_row, column=col_map["name"], value=row["product_name"])
                    if col_map.get("desc"):
                        sheet.cell(row=current_row, column=col_map["desc"], value=row["description"] if pd.notna(row["description"]) else "")
                    if col_map.get("brand"):
                        sheet.cell(row=current_row, column=col_map["brand"], value=row["brand"] if pd.notna(row["brand"]) else "No Brand")
                    if col_map.get("weight"):
                        sheet.cell(row=current_row, column=col_map["weight"], value=row["weight_kg"])

                    # Image Mapping (up to 9 URLs)
                    images = row["image_urls"]
                    for img_i in range(1, 10):
                        img_key = f"img_{img_i}"
                        if col_map.get(img_key) and len(images) >= img_i:
                            sheet.cell(row=current_row, column=col_map[img_key], value=images[img_i - 1])

                    # Variation-level values
                    if col_map.get("var_1_name"):
                        sheet.cell(row=current_row, column=col_map["var_1_name"], value=var["var_1_name"])
                    if col_map.get("var_1_val"):
                        sheet.cell(row=current_row, column=col_map["var_1_val"], value=var["var_1_val"])
                    if col_map.get("var_2_name"):
                        sheet.cell(row=current_row, column=col_map["var_2_name"], value=var["var_2_name"])
                    if col_map.get("var_2_val"):
                        sheet.cell(row=current_row, column=col_map["var_2_val"], value=var["var_2_val"])
                    
                    # Variation SKU
                    if col_map.get("var_sku"):
                        sheet.cell(row=current_row, column=col_map["var_sku"], value=var["var_sku"])
                    
                    # Shopee variation price / stock
                    if col_map.get("price"):
                        sheet.cell(row=current_row, column=col_map["price"], value=var["var_price"])
                    if col_map.get("stock"):
                        sheet.cell(row=current_row, column=col_map["stock"], value=var["var_stock"])

                    current_row += 1

            wb.save(output_path)
            logger.info("Successfully exported Shopee data into %s", output_path)
        except Exception as e:
            logger.error("Error exporting data to Shopee template: %s", str(e), exc_info=True)
            raise e

    def export_to_tiktok(self, template_path: str, output_path: str, header_row: int = 4, start_row: int = 5):
        """
        Appends product records to TikTok Shop template converting weight to grams 
        and mapping dimensions.

        Args:
            template_path: Path to the template xlsx file.
            output_path: Path where the resulting xlsx file should be saved.
            header_row: 1-indexed row number containing template header texts.
            start_row: 1-indexed row number to start writing data.
        """
        wb = self._load_template(template_path)
        sheet = wb.active

        # TikTok headers keywords
        keywords_map = {
            "name": ["product name", "ชื่อสินค้า"],
            "desc": ["description", "รายละเอียดสินค้า"],
            "var_sku": ["seller sku", "sku ผู้ขาย", "รหัสสินค้าตัวเลือก"],
            "price": ["price", "ราคา"],
            "stock": ["stock", "คลัง", "จำนวนสต็อก"],
            "weight_g": ["package weight", "น้ำหนักกล่องบรรจุ", "weight(g)"],
            "length": ["package length", "ความยาวกล่องบรรจุ", "length"],
            "width": ["package width", "ความกว้างกล่องบรรจุ", "width"],
            "height": ["package height", "ความสูงกล่องบรรจุ", "height"],
            "img_1": ["main image", "ภาพหลัก", "ภาพหน้าปก", "product image 1"],
            "img_2": ["product image 2", "ภาพ 2"],
            "img_3": ["product image 3", "ภาพ 3"],
            "img_4": ["product image 4", "ภาพ 4"],
            "img_5": ["product image 5", "ภาพ 5"],
            "img_6": ["product image 6", "ภาพ 6"],
            "img_7": ["product image 7", "ภาพ 7"],
            "img_8": ["product image 8", "ภาพ 8"],
            "img_9": ["product image 9", "ภาพ 9"],
        }

        col_map = self._find_header_column_map(sheet, header_row, keywords_map)

        current_row = start_row
        try:
            for _, row in self.df.iterrows():
                variants = self._explode_variants(row)
                
                # Default packaging values
                length_val = 10  # 10 cm default
                width_val = 10   # 10 cm default
                height_val = 10  # 10 cm default

                for var in variants:
                    if col_map.get("name"):
                        sheet.cell(row=current_row, column=col_map["name"], value=row["product_name"])
                    if col_map.get("desc"):
                        sheet.cell(row=current_row, column=col_map["desc"], value=row["description"] if pd.notna(row["description"]) else "")
                    
                    # Weight in grams conversion: kg * 1000
                    if col_map.get("weight_g"):
                        sheet.cell(row=current_row, column=col_map["weight_g"], value=int(row["weight_kg"] * 1000))
                    
                    # Dimension settings
                    if col_map.get("length"):
                        sheet.cell(row=current_row, column=col_map["length"], value=length_val)
                    if col_map.get("width"):
                        sheet.cell(row=current_row, column=col_map["width"], value=width_val)
                    if col_map.get("height"):
                        sheet.cell(row=current_row, column=col_map["height"], value=height_val)

                    # Image list mapping
                    images = row["image_urls"]
                    for img_i in range(1, 10):
                        img_key = f"img_{img_i}"
                        if col_map.get(img_key) and len(images) >= img_i:
                            sheet.cell(row=current_row, column=col_map[img_key], value=images[img_i - 1])

                    # SKU and price settings
                    if col_map.get("var_sku"):
                        sheet.cell(row=current_row, column=col_map["var_sku"], value=var["var_sku"])
                    if col_map.get("price"):
                        sheet.cell(row=current_row, column=col_map["price"], value=var["var_price"])
                    if col_map.get("stock"):
                        sheet.cell(row=current_row, column=col_map["stock"], value=var["var_stock"])

                    current_row += 1

            wb.save(output_path)
            logger.info("Successfully exported TikTok Shop data into %s", output_path)
        except Exception as e:
            logger.error("Error exporting data to TikTok template: %s", str(e), exc_info=True)
            raise e

    def export_to_lazada(self, template_path: str, output_path: str, header_row: int = 3, start_row: int = 4):
        """
        Appends product records to Lazada template, identifying the sheet that matches 
        the product category name, and groups variations using 'Group No' linking logic.

        Args:
            template_path: Path to the template xlsx file.
            output_path: Path where the resulting xlsx file should be saved.
            header_row: 1-indexed row number containing template header texts.
            start_row: 1-indexed row number to start writing data.
        """
        wb = self._load_template(template_path)
        
        # Keywords for Lazada dynamic matching
        keywords_map = {
            "name": ["name", "ชื่อสินค้า", "product name"],
            "desc": ["description", "รายละเอียดสินค้า", "long description"],
            "brand": ["brand", "แบรนด์"],
            "weight": ["weight", "น้ำหนัก", "package weight"],
            "price": ["price", "ราคา"],
            "stock": ["stock", "คลัง", "quantity"],
            "seller_sku": ["seller sku", "seller_sku", "sku ผู้ขาย"],
            "group_no": ["group no", "group_no", "รหัสเชื่อมโยงกลุ่ม", "associated sku"],
            "img_1": ["main image", "ภาพหน้าปก", "product image 1", "image"],
        }

        sheet_names = wb.sheetnames
        logger.info("Available template sheets in Lazada workbook: %s", sheet_names)

        # Track rows per sheet (since multiple categories can map to different sheets)
        sheet_next_row = {}

        try:
            for idx, row in self.df.iterrows():
                # Locate target sheet based on category matching sheet name (case-insensitive)
                cat = str(row["category"]).lower().strip()
                target_sheet_name = None
                
                # Check for direct matching
                for name in sheet_names:
                    if name.lower().strip() == cat or cat in name.lower().strip() or name.lower().strip() in cat:
                        target_sheet_name = name
                        break
                
                # Fallback to active sheet or first sheet if no match is found
                if not target_sheet_name:
                    target_sheet_name = sheet_names[0]
                    logger.warning(
                        "No direct sheet name matches category '%s'. Defaulting to sheet '%s'", 
                        row["category"], target_sheet_name
                    )

                sheet = wb[target_sheet_name]
                
                # Initialize row writing index for this sheet
                if target_sheet_name not in sheet_next_row:
                    sheet_next_row[target_sheet_name] = start_row

                current_row = sheet_next_row[target_sheet_name]
                
                # Dynamic mapping for the selected sheet
                col_map = self._find_header_column_map(sheet, header_row, keywords_map)

                variants = self._explode_variants(row)
                # Lazada variant mapping relies on "Group No" (Group key) connecting multiple SKUs
                # We use the product_id as the group key.
                group_key = row["product_id"]

                for var in variants:
                    if col_map.get("name"):
                        sheet.cell(row=current_row, column=col_map["name"], value=row["product_name"])
                    if col_map.get("desc"):
                        sheet.cell(row=current_row, column=col_map["desc"], value=row["description"] if pd.notna(row["description"]) else "")
                    if col_map.get("brand"):
                        sheet.cell(row=current_row, column=col_map["brand"], value=row["brand"] if pd.notna(row["brand"]) else "No Brand")
                    if col_map.get("weight"):
                        sheet.cell(row=current_row, column=col_map["weight"], value=row["weight_kg"])
                    
                    # Image list mapping (cover image)
                    if col_map.get("img_1") and len(row["image_urls"]) > 0:
                        sheet.cell(row=current_row, column=col_map["img_1"], value=row["image_urls"][0])

                    # Variation details (Lazada)
                    if col_map.get("seller_sku"):
                        sheet.cell(row=current_row, column=col_map["seller_sku"], value=var["var_sku"])
                    if col_map.get("group_no"):
                        sheet.cell(row=current_row, column=col_map["group_no"], value=group_key)
                    if col_map.get("price"):
                        sheet.cell(row=current_row, column=col_map["price"], value=var["var_price"])
                    if col_map.get("stock"):
                        sheet.cell(row=current_row, column=col_map["stock"], value=var["var_stock"])

                    current_row += 1
                
                # Save the next index update for this sheet
                sheet_next_row[target_sheet_name] = current_row

            wb.save(output_path)
            logger.info("Successfully exported Lazada data into %s", output_path)
        except Exception as e:
            logger.error("Error exporting data to Lazada template: %s", str(e), exc_info=True)
            raise e


# --- Demonstration usage & Testing block ---
if __name__ == "__main__":
    # Example mock database data
    pim_mock_products = [
        {
            "product_id": "PIM-GOLD-POMADE",
            "product_name": "Barber Brain Pomade Gold Edition",
            "description": "High-hold premium pomade for hair styling.",
            "brand": "Barber Brain",
            "category": "Hair Care",
            "price": 320.0,
            "stock": 100,
            "weight_kg": 0.150,
            "image_urls": ["https://images.unsplash.com/photo-1608248597279-f99d160bfcbc", "https://images.unsplash.com/photo-1595853035070-59a39fe84de3"],
            "options": [
                {"name": "Hold Type", "values": ["Classic Hold", "Extreme Hold"]},
                {"name": "Scent", "values": ["Sandalwood", "Ocean Breeze"]}
            ]
        },
        {
            "product_id": "PIM-CLAY-MATTE",
            "product_name": "Phanvadee Matte Styling Clay",
            "description": "Matte finish strong hold hair styling clay.",
            "brand": "Phanvadee",
            "category": "Hair Care",
            "price": 280.0,
            "stock": 50,
            "weight_kg": 0.100,
            "image_urls": ["https://images.unsplash.com/photo-1598440947619-2c35fc9aa908"],
            "options": []
        }
    ]

    print("Data Engineering Module Loaded successfully.")
    # Initialize exporter
    exporter = MarketplaceExporter(pim_mock_products)
    
    # Showcase how to run it in a server framework (e.g., FastAPI / Flask endpoint):
    """
    @app.post("/export/marketplace")
    def export_products(request: ExportRequest):
        # 1. Fetch raw PIM database products matching selection
        products = db.get_products(request.product_ids)
        
        # 2. Map to local template paths and temporary output path
        exporter = MarketplaceExporter(products)
        
        # 3. Export
        if request.platform == "shopee":
            exporter.export_to_shopee(
                template_path="./templates/shopee_mass_upload.xlsx",
                output_path="./outputs/shopee_output.xlsx"
            )
        ...
        return FileResponse(path=output_path, filename=f"{request.platform}_upload.xlsx")
    """
