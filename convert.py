import pandas as pd

# load csv
df = pd.read_csv("A_Z_medicines_dataset_of_India.csv")

# keep only useful columns
df = df[["name", "manufacturer_name"]]

# rename column
df = df.rename(columns={"manufacturer_name": "manufacturer"})

# convert to json
df.to_json("medicines.json", orient="records", indent=2)

print("JSON file created successfully")