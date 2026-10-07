-- CV Builder: keep the editable CV JSON next to the generated PDF so candidates can re-edit it.
ALTER TABLE cvs ADD COLUMN builder_data JSON NULL;
