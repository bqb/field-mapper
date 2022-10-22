// app/components/image-uploader.tsx

import React, { useRef, useState } from "react";
import { Form } from "@remix-run/react";
import { AiOutlinePlus, AiOutlineCheck } from "react-icons/ai";

import "@loaders.gl/polyfills";
import { KMLLoader } from "@loaders.gl/kml";
import { GeoJSONLoader } from "@loaders.gl/json/dist/geojson-loader";
import { ShapefileLoader } from "@loaders.gl/shapefile";
import { load, selectLoader } from "@loaders.gl/core";

export const LayerUploader = () => {
  const [draggingOver, setDraggingOver] = useState(false);
  const [formData, setFormData] = useState({
    features: "",
    name: "",
    field: "",
    surveyId: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef(null);

  // 1
  const preventDefaults = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 2
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    preventDefaults(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // 3
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) {
      if (event.currentTarget.files.length > 1) {
        handleShpUpload(Array.from(event.currentTarget.files));
      } else if (event.currentTarget.files[0]) {
        handleFileUpload(event.currentTarget.files[0]);
      }
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    setFormData((form) => ({ ...form, [field]: event.target.value }));
  };

  const handleFileUpload = async (file: File) => {
    const loader = await selectLoader(file, [KMLLoader, GeoJSONLoader]);
    const data = await load(file, loader);
    const features = data.features.map((f) => ({ geojson: f }));    
    setFormData((form) => ({
      ...form,
      features: JSON.stringify(features),
    }));
  };

  const handleShpUpload = async (files: File[]) => {
    let shpUrl = "";
    for (const file of files) {
      let inputFormData = new FormData();
      inputFormData.append("layer", file);
      const response = await fetch("/actions/layer-upload", {
        method: "POST",
        body: inputFormData,
      });

      const layerUrl = await response.json();
      const extension = layerUrl.split(".").pop();
      if (extension == "shp") {
        shpUrl = layerUrl;
      }
    }

    const data = await load(shpUrl, ShapefileLoader);
    const features = data.data.map((f) => ({ geojson: f }));
    setFormData((form) => ({
      ...form,
      features: JSON.stringify(features),
    }));
  };

  // 4
  return (
    <Form method="post" action="/actions/layer-create" className="flex flex-col">
      <div className="flex flex-row">
        <div
          ref={dropRef}
          className={`${
            draggingOver ? "border-4 border-dashed border-yellow-300" : ""
          } group relative w-32 mt-3 h-32 flex justify-center items-center bg-black border border-slate-100 transition duration-300 ease-in-out hover:bg-red-500 cursor-pointer`}
          onDragEnter={() => setDraggingOver(true)}
          onDragLeave={() => setDraggingOver(false)}
          onDrag={preventDefaults}
          onDragStart={preventDefaults}
          onDragEnd={preventDefaults}
          onDragOver={preventDefaults}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="font-extrabold text-4xl text-gray-200 cursor-pointer select-none transition duration-300 ease-in-out pointer-events-none z-10">
            {formData.features.length > 0 ? (
              <AiOutlineCheck />
            ) : (
              <AiOutlinePlus />
            )}
          </p>

          <input
            type="file"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
            multiple
          />
        </div>
        <input
          type="text"
          name="features"
          value={formData.features}
          className="hidden"
          readOnly
        />
        <div className="flex flex-col ml-4">
          <label className="text-white font-sans">Layer Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={(e) => handleInputChange(e, "name")}
            required
          />
          <label className="text-white font-sans">Label Field (optional) </label>
          <input
            type="text"
            name="field"
            value={formData.field}
            onChange={(e) => handleInputChange(e, "field")}
          />
          <label className="text-white font-sans">Default Survey (optional)</label>
          <input
            type="text"
            name="surveyId"
            value={formData.surveyId}
            onChange={(e) => handleInputChange(e, "surveyId")}
          />
        </div>
      </div>
      <button
        type="submit"
        className="rounded-xl font-sans mt-6 bg-black border border-white px-3 py-2 text-white font-semibold transition duration-300 ease-in-out hover:bg-red-500 hover:-translate-y-1"
      >
        Create Layer
      </button>
    </Form>
  );
};
