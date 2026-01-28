import json
import pandas as pd

file_path = '23May2024Model.xlsx'
xl = pd.ExcelFile(file_path)
sheet_name = 'Sheet1'
nvars = 22
E_max = 8 #refers to 8 etiologies E0 to E7
T_max = 1

all_data = {}

row_start = 2
column_start = 2

# Check the maximum columns available in the sheet to prevent out-of-bounds access

for E in range(E_max + 1):
    for T in range(T_max + 1):
        start_row = E * (nvars+1) + (row_start - 2) 
        start_col_b = T * (nvars + 5) + 3 + (column_start -2)
        start_col_v = T * (nvars + 5) + 5 + (column_start -2)

        # Printing calculated indices
        print(f"Processing E{E}T{T} -> start_row: {start_row}, start_col_b: {start_col_b}, start_col_v: {start_col_v}")

        # Proceed with extraction if the indices are within bounds
        try:
            B = xl.parse(sheet_name=sheet_name, skiprows=start_row, nrows=nvars, usecols=range(start_col_b , start_col_b + 1))
            V = xl.parse(sheet_name=sheet_name, skiprows=start_row, nrows=nvars, usecols=range(start_col_v , start_col_v + nvars ))

            # Print extracted matrices for verification
            print(f"B matrix for E{E}T{T}:\n{B}")
            print(f"V matrix for E{E}T{T}:\n{V}")

            if not B.empty and not V.empty:
                key = f"E{E}T{T}"
                all_data[key] = {
                    "B": B.values.tolist(),
                    "V": V.values.tolist()
                }
            else:
                print(f"No data found for E{E}T{T}")
            
        except Exception as e:
            print(f"Error processing E{E}T{T}: {e}")


json_output = json.dumps(all_data, indent=4)
json_file_name = 'output.json'
with open(json_file_name, 'w') as json_file:
    json_file.write(json_output)

print(f"JSON data has been written to {json_file_name}")
