/**
 * Fixture do seed científico PR-8a — GERADO por scripts/gen_seed_8a.mjs a
 * partir dos dados verbatim de FRIEND 2015 (Tabela 3) e Mathiowetz 1985
 * (Tabela 2, mão direita). NÃO editar à mão: espelha exatamente a migração
 * 20260827_seed_reference_ranges.sql (mesmos UUIDs e valores).
 */
import type { Vo2ReferenceRange, HandgripReferenceRange } from "@/utils/classification";

export interface SeededVo2Row extends Vo2ReferenceRange { id: string; source: string }
export interface SeededHandgripRow extends HandgripReferenceRange { id: string; source: string }

export const VO2_SEED: SeededVo2Row[] = [
  {
    "id": "b829e86d-35d3-53b9-a44a-ff55b341413a",
    "sex": "M",
    "age_min": 20,
    "age_max": 29,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 32.09,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "c0737b8e-6ace-5bee-b81f-987c64c9867d",
    "sex": "M",
    "age_min": 20,
    "age_max": 29,
    "classification": "Fraco",
    "vo2_min": 32.1,
    "vo2_max": 40.09,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "c435bf82-35b2-55c1-ba54-1c147b6c4ac8",
    "sex": "M",
    "age_min": 20,
    "age_max": 29,
    "classification": "Regular",
    "vo2_min": 40.1,
    "vo2_max": 47.99,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "054cb8b7-dd8f-5b8d-9316-59f6c30cd649",
    "sex": "M",
    "age_min": 20,
    "age_max": 29,
    "classification": "Bom",
    "vo2_min": 48,
    "vo2_max": 55.19,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "ea95eeac-7997-52f8-b1fb-2b0e8da4681f",
    "sex": "M",
    "age_min": 20,
    "age_max": 29,
    "classification": "Excelente",
    "vo2_min": 55.2,
    "vo2_max": 66.29,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "587d21f1-12ab-5281-be81-e1e55ee5a33c",
    "sex": "M",
    "age_min": 20,
    "age_max": 29,
    "classification": "Superior",
    "vo2_min": 66.3,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "36a19ef5-eb8c-5c98-a300-bc94689e9099",
    "sex": "M",
    "age_min": 30,
    "age_max": 39,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 30.19,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "6a0bf2a6-6e54-58b6-9dcc-458d19713233",
    "sex": "M",
    "age_min": 30,
    "age_max": 39,
    "classification": "Fraco",
    "vo2_min": 30.2,
    "vo2_max": 35.89,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "33b0a0b9-d810-57a7-b73d-eb990c3297a1",
    "sex": "M",
    "age_min": 30,
    "age_max": 39,
    "classification": "Regular",
    "vo2_min": 35.9,
    "vo2_max": 42.39,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "ee61e985-244e-5183-bf06-b21434f5de9d",
    "sex": "M",
    "age_min": 30,
    "age_max": 39,
    "classification": "Bom",
    "vo2_min": 42.4,
    "vo2_max": 49.19,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "ca0b5b6a-5a64-57e8-9bc7-3881fc6b67c2",
    "sex": "M",
    "age_min": 30,
    "age_max": 39,
    "classification": "Excelente",
    "vo2_min": 49.2,
    "vo2_max": 59.79,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "f8a25f3a-d5f5-5d6a-befd-690e1478a398",
    "sex": "M",
    "age_min": 30,
    "age_max": 39,
    "classification": "Superior",
    "vo2_min": 59.8,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "5ab9f8ac-9113-59ca-850f-17f5cf3831c2",
    "sex": "M",
    "age_min": 40,
    "age_max": 49,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 26.79,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "e254c3bb-9817-5ea7-880e-218cca276803",
    "sex": "M",
    "age_min": 40,
    "age_max": 49,
    "classification": "Fraco",
    "vo2_min": 26.8,
    "vo2_max": 31.89,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "bdf14b9a-4603-5bbd-b967-1494334eed8f",
    "sex": "M",
    "age_min": 40,
    "age_max": 49,
    "classification": "Regular",
    "vo2_min": 31.9,
    "vo2_max": 37.79,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "e7518ac6-4e91-5c79-8675-e718ff06f917",
    "sex": "M",
    "age_min": 40,
    "age_max": 49,
    "classification": "Bom",
    "vo2_min": 37.8,
    "vo2_max": 44.99,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "43de6300-8526-5bc6-9ad7-dcb40663546e",
    "sex": "M",
    "age_min": 40,
    "age_max": 49,
    "classification": "Excelente",
    "vo2_min": 45,
    "vo2_max": 55.59,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "34bfc33e-71e7-5eb8-ad1a-2e5864c7da28",
    "sex": "M",
    "age_min": 40,
    "age_max": 49,
    "classification": "Superior",
    "vo2_min": 55.6,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "d16c58d5-ec1d-5177-8e14-2ec1bbc6f0dc",
    "sex": "M",
    "age_min": 50,
    "age_max": 59,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 22.79,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "399f3f55-04e7-5a06-8834-11293a773000",
    "sex": "M",
    "age_min": 50,
    "age_max": 59,
    "classification": "Fraco",
    "vo2_min": 22.8,
    "vo2_max": 27.09,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "51ae30d5-58db-5cdd-9344-0313dd3c71f2",
    "sex": "M",
    "age_min": 50,
    "age_max": 59,
    "classification": "Regular",
    "vo2_min": 27.1,
    "vo2_max": 32.59,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "bfe4050a-50a0-5b08-b94e-1c64ef3486d1",
    "sex": "M",
    "age_min": 50,
    "age_max": 59,
    "classification": "Bom",
    "vo2_min": 32.6,
    "vo2_max": 39.69,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "0f261912-4cd7-5906-8ae6-2a59df6e1f76",
    "sex": "M",
    "age_min": 50,
    "age_max": 59,
    "classification": "Excelente",
    "vo2_min": 39.7,
    "vo2_max": 50.69,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "7b159fc0-500f-59a8-a31e-ade9333773f3",
    "sex": "M",
    "age_min": 50,
    "age_max": 59,
    "classification": "Superior",
    "vo2_min": 50.7,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "02db2d6b-f81f-56be-b082-ded62925249b",
    "sex": "M",
    "age_min": 60,
    "age_max": 69,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 19.79,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "98b5d00c-8c43-56ce-b079-185d709d7200",
    "sex": "M",
    "age_min": 60,
    "age_max": 69,
    "classification": "Fraco",
    "vo2_min": 19.8,
    "vo2_max": 23.69,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "6a7b014f-b7cf-5c34-b13e-07bd9c3491c1",
    "sex": "M",
    "age_min": 60,
    "age_max": 69,
    "classification": "Regular",
    "vo2_min": 23.7,
    "vo2_max": 28.19,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "71ccdd8f-5e4a-5872-ad67-d1f8e70f1058",
    "sex": "M",
    "age_min": 60,
    "age_max": 69,
    "classification": "Bom",
    "vo2_min": 28.2,
    "vo2_max": 34.49,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "2613180d-a8f5-5e40-a0f6-dbd3f6805324",
    "sex": "M",
    "age_min": 60,
    "age_max": 69,
    "classification": "Excelente",
    "vo2_min": 34.5,
    "vo2_max": 42.99,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "6be734aa-a0a3-5bcf-aacc-0b5467f42b69",
    "sex": "M",
    "age_min": 60,
    "age_max": 69,
    "classification": "Superior",
    "vo2_min": 43,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "62f1b568-c357-54d0-879f-34fdf305e22d",
    "sex": "M",
    "age_min": 70,
    "age_max": 79,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 17.09,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "0e6336ad-d6d5-5f8e-83a1-33e3a2e416d5",
    "sex": "M",
    "age_min": 70,
    "age_max": 79,
    "classification": "Fraco",
    "vo2_min": 17.1,
    "vo2_max": 20.39,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "7eb96667-3e25-5133-9603-46bd75182095",
    "sex": "M",
    "age_min": 70,
    "age_max": 79,
    "classification": "Regular",
    "vo2_min": 20.4,
    "vo2_max": 24.39,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "32d533d6-d5b7-573a-a3da-4da67f0c6b7b",
    "sex": "M",
    "age_min": 70,
    "age_max": 79,
    "classification": "Bom",
    "vo2_min": 24.4,
    "vo2_max": 30.39,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "cf6ac40e-9b37-5982-bd3d-1accb0971355",
    "sex": "M",
    "age_min": 70,
    "age_max": 79,
    "classification": "Excelente",
    "vo2_min": 30.4,
    "vo2_max": 39.69,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "8e2e5ac9-0649-595e-9d8d-1e909135e3f8",
    "sex": "M",
    "age_min": 70,
    "age_max": 79,
    "classification": "Superior",
    "vo2_min": 39.7,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "1fea727c-63c9-5d4d-a9d0-feed2587cbd1",
    "sex": "F",
    "age_min": 20,
    "age_max": 29,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 23.89,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "23c6a6e4-bc48-59c7-baf8-b02fa414de1c",
    "sex": "F",
    "age_min": 20,
    "age_max": 29,
    "classification": "Fraco",
    "vo2_min": 23.9,
    "vo2_max": 30.49,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "bb4a9f62-4daa-5d47-a9a9-4c9ca5d0c4d4",
    "sex": "F",
    "age_min": 20,
    "age_max": 29,
    "classification": "Regular",
    "vo2_min": 30.5,
    "vo2_max": 37.59,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "eacafac0-a995-5549-b4ad-5e9c1a7ccb0a",
    "sex": "F",
    "age_min": 20,
    "age_max": 29,
    "classification": "Bom",
    "vo2_min": 37.6,
    "vo2_max": 44.69,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "2e422162-0e58-503b-ba8c-ae74fe4aab25",
    "sex": "F",
    "age_min": 20,
    "age_max": 29,
    "classification": "Excelente",
    "vo2_min": 44.7,
    "vo2_max": 55.99,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "599d5b46-953f-5502-b1e5-77de227e3cb2",
    "sex": "F",
    "age_min": 20,
    "age_max": 29,
    "classification": "Superior",
    "vo2_min": 56,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "fe6b2ea9-09da-5c4c-89a3-76a52b997189",
    "sex": "F",
    "age_min": 30,
    "age_max": 39,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 20.89,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "1a79bbe0-cede-5dd2-ba0c-021655de5b99",
    "sex": "F",
    "age_min": 30,
    "age_max": 39,
    "classification": "Fraco",
    "vo2_min": 20.9,
    "vo2_max": 25.29,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "4f887e04-5b53-51c1-bc41-f01614e530ed",
    "sex": "F",
    "age_min": 30,
    "age_max": 39,
    "classification": "Regular",
    "vo2_min": 25.3,
    "vo2_max": 30.19,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "6c233c5b-f8fa-59f6-86ff-aff951d913d3",
    "sex": "F",
    "age_min": 30,
    "age_max": 39,
    "classification": "Bom",
    "vo2_min": 30.2,
    "vo2_max": 36.09,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "d3f0da7e-3b26-51e0-9446-bb6ce7a9473a",
    "sex": "F",
    "age_min": 30,
    "age_max": 39,
    "classification": "Excelente",
    "vo2_min": 36.1,
    "vo2_max": 45.79,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "f0f49d2b-4382-5891-85b1-44b9ea017823",
    "sex": "F",
    "age_min": 30,
    "age_max": 39,
    "classification": "Superior",
    "vo2_min": 45.8,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "c2837db9-f3fb-5b6d-8402-bf444120806b",
    "sex": "F",
    "age_min": 40,
    "age_max": 49,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 18.79,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "25874392-7d13-55c5-a5af-d29649eb90de",
    "sex": "F",
    "age_min": 40,
    "age_max": 49,
    "classification": "Fraco",
    "vo2_min": 18.8,
    "vo2_max": 22.09,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "d9361284-c32d-56e6-958f-c0e3c4861508",
    "sex": "F",
    "age_min": 40,
    "age_max": 49,
    "classification": "Regular",
    "vo2_min": 22.1,
    "vo2_max": 26.69,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "1f149769-ffe9-5021-b395-c831e43224c0",
    "sex": "F",
    "age_min": 40,
    "age_max": 49,
    "classification": "Bom",
    "vo2_min": 26.7,
    "vo2_max": 32.39,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "2e42dd1b-cf25-51a6-8544-c5190f02091b",
    "sex": "F",
    "age_min": 40,
    "age_max": 49,
    "classification": "Excelente",
    "vo2_min": 32.4,
    "vo2_max": 41.69,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "c66cdc5e-365a-5b86-8a05-253a75c896da",
    "sex": "F",
    "age_min": 40,
    "age_max": 49,
    "classification": "Superior",
    "vo2_min": 41.7,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "597f2464-8f00-52a1-80cc-ca5a5e4ce25e",
    "sex": "F",
    "age_min": 50,
    "age_max": 59,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 17.29,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "e9b1f891-18d1-5c29-9236-b8f93e04ed77",
    "sex": "F",
    "age_min": 50,
    "age_max": 59,
    "classification": "Fraco",
    "vo2_min": 17.3,
    "vo2_max": 19.89,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "16d57633-ea4f-5080-89e9-9e9f3bc9bccd",
    "sex": "F",
    "age_min": 50,
    "age_max": 59,
    "classification": "Regular",
    "vo2_min": 19.9,
    "vo2_max": 23.39,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "53b2123e-e820-5a3f-be0b-1c61d12873d7",
    "sex": "F",
    "age_min": 50,
    "age_max": 59,
    "classification": "Bom",
    "vo2_min": 23.4,
    "vo2_max": 27.59,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "c67b102e-0b8b-5d5e-b25b-6f3dec4c9640",
    "sex": "F",
    "age_min": 50,
    "age_max": 59,
    "classification": "Excelente",
    "vo2_min": 27.6,
    "vo2_max": 35.89,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "f0a523a2-eb7a-5654-af0d-3b6fb503578c",
    "sex": "F",
    "age_min": 50,
    "age_max": 59,
    "classification": "Superior",
    "vo2_min": 35.9,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "25d63f7e-3dc9-5304-8265-778ab1b2985a",
    "sex": "F",
    "age_min": 60,
    "age_max": 69,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 14.59,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "93e7126d-6a9a-5a81-acd4-6a0faabcd5d0",
    "sex": "F",
    "age_min": 60,
    "age_max": 69,
    "classification": "Fraco",
    "vo2_min": 14.6,
    "vo2_max": 17.19,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "1afac960-58a6-568a-86b6-d4c68c4816ba",
    "sex": "F",
    "age_min": 60,
    "age_max": 69,
    "classification": "Regular",
    "vo2_min": 17.2,
    "vo2_max": 19.99,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "05f17dfd-5393-5d40-9bf6-e3d836bfa073",
    "sex": "F",
    "age_min": 60,
    "age_max": 69,
    "classification": "Bom",
    "vo2_min": 20,
    "vo2_max": 23.79,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "b6dc9604-3e00-55f7-8c99-dd34f18f6a58",
    "sex": "F",
    "age_min": 60,
    "age_max": 69,
    "classification": "Excelente",
    "vo2_min": 23.8,
    "vo2_max": 29.39,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "467ac0af-806f-5c58-bf1c-6ff922fa90d8",
    "sex": "F",
    "age_min": 60,
    "age_max": 69,
    "classification": "Superior",
    "vo2_min": 29.4,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "79379ab2-28f3-5af9-abc3-9ba405f6ff53",
    "sex": "F",
    "age_min": 70,
    "age_max": 79,
    "classification": "Muito Fraco",
    "vo2_min": 0,
    "vo2_max": 13.59,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "6c4f08b4-cc91-5b3c-ac4a-7c8ff9b9d2a6",
    "sex": "F",
    "age_min": 70,
    "age_max": 79,
    "classification": "Fraco",
    "vo2_min": 13.6,
    "vo2_max": 15.59,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "590d63b2-d414-5f69-8eae-64543ae1b687",
    "sex": "F",
    "age_min": 70,
    "age_max": 79,
    "classification": "Regular",
    "vo2_min": 15.6,
    "vo2_max": 18.29,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "3969b27d-630e-58f5-b6bd-b317286f059e",
    "sex": "F",
    "age_min": 70,
    "age_max": 79,
    "classification": "Bom",
    "vo2_min": 18.3,
    "vo2_max": 20.79,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "dda06666-d736-5c3a-a5fa-b7b5c548981a",
    "sex": "F",
    "age_min": 70,
    "age_max": 79,
    "classification": "Excelente",
    "vo2_min": 20.8,
    "vo2_max": 24.09,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  },
  {
    "id": "87debec6-5346-5e9f-81c8-0f4a2ec1dd4a",
    "sex": "F",
    "age_min": 70,
    "age_max": 79,
    "classification": "Superior",
    "vo2_min": 24.1,
    "vo2_max": 120,
    "source": "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)"
  }
];

export const HANDGRIP_SEED: SeededHandgripRow[] = [
  {
    "id": "33f95f17-c617-580f-a87f-b9cc840b0027",
    "sex": "M",
    "age_min": 20,
    "age_max": 24,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 36.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "387cd383-b165-5073-9d90-3c09f331ed18",
    "sex": "M",
    "age_min": 20,
    "age_max": 24,
    "classification": "Baixo",
    "kg_min": 36.2,
    "kg_max": 45.49,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "2e2cc14e-c5c5-55c3-a638-f9870c39fd18",
    "sex": "M",
    "age_min": 20,
    "age_max": 24,
    "classification": "Médio",
    "kg_min": 45.5,
    "kg_max": 64.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "9b60de02-15f9-531d-b6c4-3d3c67c4b326",
    "sex": "M",
    "age_min": 20,
    "age_max": 24,
    "classification": "Alto",
    "kg_min": 64.2,
    "kg_max": 73.59,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "632b1ebe-1752-55df-8a75-0110475e1545",
    "sex": "M",
    "age_min": 20,
    "age_max": 24,
    "classification": "Muito Alto",
    "kg_min": 73.6,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "a6b97cd6-ad34-5ce7-a1cf-30998f54d905",
    "sex": "M",
    "age_min": 25,
    "age_max": 29,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 33.89,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "2ef4ff74-f434-5d8f-9522-3cac9693ecb3",
    "sex": "M",
    "age_min": 25,
    "age_max": 29,
    "classification": "Baixo",
    "kg_min": 33.9,
    "kg_max": 44.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "0716e4d4-a666-5f0d-a5b6-05a66c923908",
    "sex": "M",
    "age_min": 25,
    "age_max": 29,
    "classification": "Médio",
    "kg_min": 44.4,
    "kg_max": 65.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "11d8e528-ea3f-556a-9b7b-5f11abb8ac26",
    "sex": "M",
    "age_min": 25,
    "age_max": 29,
    "classification": "Alto",
    "kg_min": 65.2,
    "kg_max": 75.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "351a43b3-aa0f-5cde-ae27-677f253058e4",
    "sex": "M",
    "age_min": 25,
    "age_max": 29,
    "classification": "Muito Alto",
    "kg_min": 75.7,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "0211bcea-9b13-5d85-a950-ba23c85037ef",
    "sex": "M",
    "age_min": 30,
    "age_max": 34,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 34.89,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "1b08898a-2764-5294-998f-97252ce917f6",
    "sex": "M",
    "age_min": 30,
    "age_max": 34,
    "classification": "Baixo",
    "kg_min": 34.9,
    "kg_max": 45.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "48bd32ea-72e4-582b-b499-0af02dc5edac",
    "sex": "M",
    "age_min": 30,
    "age_max": 34,
    "classification": "Médio",
    "kg_min": 45.1,
    "kg_max": 65.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "d10962ca-8cb9-5f86-9918-a55c52f398fd",
    "sex": "M",
    "age_min": 30,
    "age_max": 34,
    "classification": "Alto",
    "kg_min": 65.4,
    "kg_max": 75.59,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "67530fff-06a2-5be2-beb6-2c0524034b02",
    "sex": "M",
    "age_min": 30,
    "age_max": 34,
    "classification": "Muito Alto",
    "kg_min": 75.6,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "c1c57dac-0a4b-5d84-ba56-96b3206cccb8",
    "sex": "M",
    "age_min": 35,
    "age_max": 39,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 32.49,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "e9718a2f-fcf2-506d-a0c3-2cca7df01890",
    "sex": "M",
    "age_min": 35,
    "age_max": 39,
    "classification": "Baixo",
    "kg_min": 32.5,
    "kg_max": 43.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "da497de1-25f4-5ba9-8a6b-c122040f6a5f",
    "sex": "M",
    "age_min": 35,
    "age_max": 39,
    "classification": "Médio",
    "kg_min": 43.4,
    "kg_max": 65.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "f213df58-2b37-5fe6-b04d-737cbf1acda4",
    "sex": "M",
    "age_min": 35,
    "age_max": 39,
    "classification": "Alto",
    "kg_min": 65.2,
    "kg_max": 76.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "61b35477-3a80-597d-882f-8f47b01963d4",
    "sex": "M",
    "age_min": 35,
    "age_max": 39,
    "classification": "Muito Alto",
    "kg_min": 76.1,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "e7220802-7b73-5512-95a5-95e3fca07412",
    "sex": "M",
    "age_min": 40,
    "age_max": 44,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 34.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "abeb02b8-d423-56d8-ae1b-699f2788412a",
    "sex": "M",
    "age_min": 40,
    "age_max": 44,
    "classification": "Baixo",
    "kg_min": 34.2,
    "kg_max": 43.59,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "64695356-2511-55bd-b092-b73096d2df59",
    "sex": "M",
    "age_min": 40,
    "age_max": 44,
    "classification": "Médio",
    "kg_min": 43.6,
    "kg_max": 62.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "493b1433-9b10-5fcc-a1bd-8b383225bcd4",
    "sex": "M",
    "age_min": 40,
    "age_max": 44,
    "classification": "Alto",
    "kg_min": 62.4,
    "kg_max": 71.79,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "c2609c3f-2c67-561c-bdbe-f4c07929be16",
    "sex": "M",
    "age_min": 40,
    "age_max": 44,
    "classification": "Muito Alto",
    "kg_min": 71.8,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "cec18e62-352d-5cbe-83b0-638ee053f242",
    "sex": "M",
    "age_min": 45,
    "age_max": 49,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 28.99,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "63dde9b4-df30-5896-9d78-87ed7152519a",
    "sex": "M",
    "age_min": 45,
    "age_max": 49,
    "classification": "Baixo",
    "kg_min": 29,
    "kg_max": 39.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "89963208-6dd8-5643-9e3f-40df9dbef1a6",
    "sex": "M",
    "age_min": 45,
    "age_max": 49,
    "classification": "Médio",
    "kg_min": 39.4,
    "kg_max": 60.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "bfd50df3-dde5-5b4e-bb35-95099b287150",
    "sex": "M",
    "age_min": 45,
    "age_max": 49,
    "classification": "Alto",
    "kg_min": 60.3,
    "kg_max": 70.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "2fdb95cc-2618-5e5d-815b-0ffa968e1270",
    "sex": "M",
    "age_min": 45,
    "age_max": 49,
    "classification": "Muito Alto",
    "kg_min": 70.7,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "3f4571b3-807a-5ed3-8450-87b00c22ccc0",
    "sex": "M",
    "age_min": 50,
    "age_max": 54,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 35.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "8d51d0b1-a42e-58b2-bc71-6fd425bdd273",
    "sex": "M",
    "age_min": 50,
    "age_max": 54,
    "classification": "Baixo",
    "kg_min": 35.1,
    "kg_max": 43.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "2c62710a-4208-5c0b-8674-0adb9358e8ff",
    "sex": "M",
    "age_min": 50,
    "age_max": 54,
    "classification": "Médio",
    "kg_min": 43.3,
    "kg_max": 59.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "ba1f04a9-521e-55df-b59b-6d86e8369c18",
    "sex": "M",
    "age_min": 50,
    "age_max": 54,
    "classification": "Alto",
    "kg_min": 59.7,
    "kg_max": 67.89,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "c4a8fc32-373b-576a-99eb-8d8207bba0df",
    "sex": "M",
    "age_min": 50,
    "age_max": 54,
    "classification": "Muito Alto",
    "kg_min": 67.9,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "efbce8bb-a177-51d9-aa26-7286516b9cfa",
    "sex": "M",
    "age_min": 55,
    "age_max": 59,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 21.59,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "d4cb9912-d224-5824-82cf-c13945d68327",
    "sex": "M",
    "age_min": 55,
    "age_max": 59,
    "classification": "Baixo",
    "kg_min": 21.6,
    "kg_max": 33.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "42a5f8a7-aa23-5cdc-8805-44880cdaf8fd",
    "sex": "M",
    "age_min": 55,
    "age_max": 59,
    "classification": "Médio",
    "kg_min": 33.7,
    "kg_max": 57.99,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "566e1963-d22d-524f-b025-ede68091a1f7",
    "sex": "M",
    "age_min": 55,
    "age_max": 59,
    "classification": "Alto",
    "kg_min": 58,
    "kg_max": 70.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "f0251476-607a-5f3a-88c3-4fdba3984b71",
    "sex": "M",
    "age_min": 55,
    "age_max": 59,
    "classification": "Muito Alto",
    "kg_min": 70.1,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "2a829306-b2c2-5ac5-a1ab-369173593ee4",
    "sex": "M",
    "age_min": 60,
    "age_max": 64,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 22.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "59745f85-3ad5-58c0-8272-e9b1fab6efc9",
    "sex": "M",
    "age_min": 60,
    "age_max": 64,
    "classification": "Baixo",
    "kg_min": 22.2,
    "kg_max": 31.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "27c3cf8a-cb89-5033-8b6e-b03fe1c958d2",
    "sex": "M",
    "age_min": 60,
    "age_max": 64,
    "classification": "Médio",
    "kg_min": 31.4,
    "kg_max": 49.89,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "4ce83d56-95ed-5c99-9225-4191cb5752e5",
    "sex": "M",
    "age_min": 60,
    "age_max": 64,
    "classification": "Alto",
    "kg_min": 49.9,
    "kg_max": 59.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "86a80b88-01db-5290-ae53-e956b30f8bf4",
    "sex": "M",
    "age_min": 60,
    "age_max": 64,
    "classification": "Muito Alto",
    "kg_min": 59.2,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "76bf893a-cb7a-5268-baf9-da7e47db956d",
    "sex": "M",
    "age_min": 65,
    "age_max": 69,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 22.59,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "dcf631cf-6a15-5814-93db-ffd7294bc00e",
    "sex": "M",
    "age_min": 65,
    "age_max": 69,
    "classification": "Baixo",
    "kg_min": 22.6,
    "kg_max": 31.99,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "38b64f89-cc0f-57d6-a2cd-f08f5c51519c",
    "sex": "M",
    "age_min": 65,
    "age_max": 69,
    "classification": "Médio",
    "kg_min": 32,
    "kg_max": 50.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "ce049804-df6b-5d75-8524-2fed9959e1d3",
    "sex": "M",
    "age_min": 65,
    "age_max": 69,
    "classification": "Alto",
    "kg_min": 50.7,
    "kg_max": 59.99,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "dfe5043c-c7bf-55bb-9080-222a06c1ec5b",
    "sex": "M",
    "age_min": 65,
    "age_max": 69,
    "classification": "Muito Alto",
    "kg_min": 60,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "428faa6f-8504-5410-ad1a-7b40f4733e2b",
    "sex": "M",
    "age_min": 70,
    "age_max": 74,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 14.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "2249d2d2-7e26-557b-9123-c9ad15b9db2f",
    "sex": "M",
    "age_min": 70,
    "age_max": 74,
    "classification": "Baixo",
    "kg_min": 14.7,
    "kg_max": 24.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "adc5b5af-64f3-53f4-afe5-d5f83de5d10c",
    "sex": "M",
    "age_min": 70,
    "age_max": 74,
    "classification": "Médio",
    "kg_min": 24.4,
    "kg_max": 43.89,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "b13c1cc9-dad3-5412-8c06-c3a999adbdbe",
    "sex": "M",
    "age_min": 70,
    "age_max": 74,
    "classification": "Alto",
    "kg_min": 43.9,
    "kg_max": 53.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "042646d1-d0b0-54cc-b31d-978d8d29d9e2",
    "sex": "M",
    "age_min": 70,
    "age_max": 74,
    "classification": "Muito Alto",
    "kg_min": 53.7,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "c0c1f07a-a72e-5a89-aa82-4309dabf2369",
    "sex": "M",
    "age_min": 75,
    "age_max": 99,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 10.79,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "211b9f7c-64cf-5032-9dc7-fd9c8d804b8d",
    "sex": "M",
    "age_min": 75,
    "age_max": 99,
    "classification": "Baixo",
    "kg_min": 10.8,
    "kg_max": 20.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "4aac9826-dc81-5caf-b3be-51e034b2ffaf",
    "sex": "M",
    "age_min": 75,
    "age_max": 99,
    "classification": "Médio",
    "kg_min": 20.3,
    "kg_max": 39.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "1c471fcb-c988-5437-af93-290e61ac1b28",
    "sex": "M",
    "age_min": 75,
    "age_max": 99,
    "classification": "Alto",
    "kg_min": 39.3,
    "kg_max": 48.89,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "334501a0-8d38-5206-8fc1-04b5f1e4ccd8",
    "sex": "M",
    "age_min": 75,
    "age_max": 99,
    "classification": "Muito Alto",
    "kg_min": 48.9,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "88967a2e-5c5c-58ae-9aaf-6deddd219392",
    "sex": "F",
    "age_min": 20,
    "age_max": 24,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 18.79,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "8d9c05c2-fd8c-559c-b7ac-31f79bd58946",
    "sex": "F",
    "age_min": 20,
    "age_max": 24,
    "classification": "Baixo",
    "kg_min": 18.8,
    "kg_max": 25.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "73035116-419c-591e-b314-f25f7c1573f5",
    "sex": "F",
    "age_min": 20,
    "age_max": 24,
    "classification": "Médio",
    "kg_min": 25.4,
    "kg_max": 38.49,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "f63ceb78-0f82-5bef-89a5-4c87db1bdea6",
    "sex": "F",
    "age_min": 20,
    "age_max": 24,
    "classification": "Alto",
    "kg_min": 38.5,
    "kg_max": 45.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "ec21fa5c-2586-5f6a-829c-0e5d07aede55",
    "sex": "F",
    "age_min": 20,
    "age_max": 24,
    "classification": "Muito Alto",
    "kg_min": 45.1,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "6bb9ccc9-8ee5-53ad-89fe-f50cdafa9491",
    "sex": "F",
    "age_min": 25,
    "age_max": 29,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 21.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "69de5897-cac8-51f5-8857-4c80be157911",
    "sex": "F",
    "age_min": 25,
    "age_max": 29,
    "classification": "Baixo",
    "kg_min": 21.2,
    "kg_max": 27.49,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "e02e1136-91da-5a54-b6a0-bccbb7c5abde",
    "sex": "F",
    "age_min": 25,
    "age_max": 29,
    "classification": "Médio",
    "kg_min": 27.5,
    "kg_max": 40.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "b15fb244-afc1-555b-a50a-f31b33cb912a",
    "sex": "F",
    "age_min": 25,
    "age_max": 29,
    "classification": "Alto",
    "kg_min": 40.1,
    "kg_max": 46.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "4010dedc-d03f-5894-85f8-04b30a9fdae3",
    "sex": "F",
    "age_min": 25,
    "age_max": 29,
    "classification": "Muito Alto",
    "kg_min": 46.4,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "536f950b-c798-5f62-b050-0c6e39397c71",
    "sex": "F",
    "age_min": 30,
    "age_max": 34,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 18.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "590f513e-a194-54ea-9dd9-68d2df1f7edb",
    "sex": "F",
    "age_min": 30,
    "age_max": 34,
    "classification": "Baixo",
    "kg_min": 18.3,
    "kg_max": 26.99,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "38b4cb4c-1323-5ac9-963d-92c0b4dace7e",
    "sex": "F",
    "age_min": 30,
    "age_max": 34,
    "classification": "Médio",
    "kg_min": 27,
    "kg_max": 44.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "1c336800-3911-5276-b50f-8c8ab54d6fa8",
    "sex": "F",
    "age_min": 30,
    "age_max": 34,
    "classification": "Alto",
    "kg_min": 44.4,
    "kg_max": 53.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "da544e48-c81d-5e6a-959a-dbd92adf0516",
    "sex": "F",
    "age_min": 30,
    "age_max": 34,
    "classification": "Muito Alto",
    "kg_min": 53.1,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "9ab9afd5-07ad-559f-8fc3-25152c50c406",
    "sex": "F",
    "age_min": 35,
    "age_max": 39,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 23.79,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "1b770af7-92f3-5797-a8ab-52801f031f0f",
    "sex": "F",
    "age_min": 35,
    "age_max": 39,
    "classification": "Baixo",
    "kg_min": 23.8,
    "kg_max": 28.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "08a5593b-effe-5f09-ab59-ac5c3a8fb0ea",
    "sex": "F",
    "age_min": 35,
    "age_max": 39,
    "classification": "Médio",
    "kg_min": 28.7,
    "kg_max": 38.49,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "6cec3a3c-e3a4-57fa-baed-99ce62c4e085",
    "sex": "F",
    "age_min": 35,
    "age_max": 39,
    "classification": "Alto",
    "kg_min": 38.5,
    "kg_max": 43.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "422c2c86-3e4b-55e4-8b19-919e12ea6e34",
    "sex": "F",
    "age_min": 35,
    "age_max": 39,
    "classification": "Muito Alto",
    "kg_min": 43.4,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "4a1e88c5-e8ee-50a2-b5e3-272af7b3012f",
    "sex": "F",
    "age_min": 40,
    "age_max": 44,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 19.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "f630fd18-1bf0-5351-bfd9-39d1d40c5833",
    "sex": "F",
    "age_min": 40,
    "age_max": 44,
    "classification": "Baixo",
    "kg_min": 19.7,
    "kg_max": 25.79,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "e8ae0e68-00e6-56bb-8620-575f7486e552",
    "sex": "F",
    "age_min": 40,
    "age_max": 44,
    "classification": "Médio",
    "kg_min": 25.8,
    "kg_max": 38.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "fdd96f6c-277b-5783-b7ce-529c9bc823e8",
    "sex": "F",
    "age_min": 40,
    "age_max": 44,
    "classification": "Alto",
    "kg_min": 38.1,
    "kg_max": 44.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "8a1bea22-246e-544f-abb5-dc1ac256751c",
    "sex": "F",
    "age_min": 40,
    "age_max": 44,
    "classification": "Muito Alto",
    "kg_min": 44.2,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "f0e531e6-25ee-5bc0-ac06-6f861cce067f",
    "sex": "F",
    "age_min": 45,
    "age_max": 49,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 14.49,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "e43c4d35-6e47-5ebd-a287-98dedf0e15ec",
    "sex": "F",
    "age_min": 45,
    "age_max": 49,
    "classification": "Baixo",
    "kg_min": 14.5,
    "kg_max": 21.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "ea790c5a-a974-52a7-9f60-d03b9402cd2c",
    "sex": "F",
    "age_min": 45,
    "age_max": 49,
    "classification": "Médio",
    "kg_min": 21.4,
    "kg_max": 35.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "b689e5b5-0786-5773-be09-17c38e7074df",
    "sex": "F",
    "age_min": 45,
    "age_max": 49,
    "classification": "Alto",
    "kg_min": 35.1,
    "kg_max": 41.89,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "7ee919ef-bcbd-5ec5-bcb3-76dd04a0a4ae",
    "sex": "F",
    "age_min": 45,
    "age_max": 49,
    "classification": "Muito Alto",
    "kg_min": 41.9,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "d534c4ba-6f2b-503a-b9c4-e5e1336741a7",
    "sex": "F",
    "age_min": 50,
    "age_max": 54,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 19.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "da5f163c-c20b-5427-92c8-ed8ec417bd65",
    "sex": "F",
    "age_min": 50,
    "age_max": 54,
    "classification": "Baixo",
    "kg_min": 19.3,
    "kg_max": 24.59,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "20fe85df-05ca-5280-ba4a-37bbfbaa3f48",
    "sex": "F",
    "age_min": 50,
    "age_max": 54,
    "classification": "Médio",
    "kg_min": 24.6,
    "kg_max": 35.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "d7a6db43-2440-537f-83b8-d79862521bf9",
    "sex": "F",
    "age_min": 50,
    "age_max": 54,
    "classification": "Alto",
    "kg_min": 35.1,
    "kg_max": 40.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "a566237d-b26a-53b2-9e2b-9a6c736aaaf0",
    "sex": "F",
    "age_min": 50,
    "age_max": 54,
    "classification": "Muito Alto",
    "kg_min": 40.4,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "5c5d7992-dd7b-5399-b548-8f3ab8095d91",
    "sex": "F",
    "age_min": 55,
    "age_max": 59,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 14.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "fdbce746-315f-5229-8930-0880f2fde783",
    "sex": "F",
    "age_min": 55,
    "age_max": 59,
    "classification": "Baixo",
    "kg_min": 14.7,
    "kg_max": 20.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "fa27d6f4-6415-55d5-8d89-133f3b4a4775",
    "sex": "F",
    "age_min": 55,
    "age_max": 59,
    "classification": "Médio",
    "kg_min": 20.3,
    "kg_max": 31.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "794e3def-fddf-5054-89c3-5859f3dba57f",
    "sex": "F",
    "age_min": 55,
    "age_max": 59,
    "classification": "Alto",
    "kg_min": 31.7,
    "kg_max": 37.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "9f365f8a-0c10-5ea7-b58f-4b35f9a99542",
    "sex": "F",
    "age_min": 55,
    "age_max": 59,
    "classification": "Muito Alto",
    "kg_min": 37.3,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "ede6380d-b324-54d9-bd89-d12536ab1470",
    "sex": "F",
    "age_min": 60,
    "age_max": 64,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 15.79,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "44023e27-7436-52be-af06-d3825f5be7af",
    "sex": "F",
    "age_min": 60,
    "age_max": 64,
    "classification": "Baixo",
    "kg_min": 15.8,
    "kg_max": 20.39,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "0f23e4ad-f399-524e-8061-dce065ee39a9",
    "sex": "F",
    "age_min": 60,
    "age_max": 64,
    "classification": "Médio",
    "kg_min": 20.4,
    "kg_max": 29.59,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "fce8ef26-e163-5c4a-88c5-d5c23e461db1",
    "sex": "F",
    "age_min": 60,
    "age_max": 64,
    "classification": "Alto",
    "kg_min": 29.6,
    "kg_max": 34.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "9ad573eb-0b2b-5906-953e-8b93a7051735",
    "sex": "F",
    "age_min": 60,
    "age_max": 64,
    "classification": "Muito Alto",
    "kg_min": 34.2,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "c900b506-3679-52a8-85b3-643c677cc2f4",
    "sex": "F",
    "age_min": 65,
    "age_max": 69,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 13.69,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "5d2907ce-bc27-5434-afb1-4fc7dbb05abc",
    "sex": "F",
    "age_min": 65,
    "age_max": 69,
    "classification": "Baixo",
    "kg_min": 13.7,
    "kg_max": 18.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "4ce516fa-7b9c-5ff8-8ce9-b7ad8c7895aa",
    "sex": "F",
    "age_min": 65,
    "age_max": 69,
    "classification": "Médio",
    "kg_min": 18.1,
    "kg_max": 26.89,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "1b65b78d-f4f6-546a-86ad-e78749d6e776",
    "sex": "F",
    "age_min": 65,
    "age_max": 69,
    "classification": "Alto",
    "kg_min": 26.9,
    "kg_max": 31.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "b757b093-fac2-55c0-bd9c-8ac379f3bfb8",
    "sex": "F",
    "age_min": 65,
    "age_max": 69,
    "classification": "Muito Alto",
    "kg_min": 31.3,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "002c9aee-5944-5d57-9518-23a38d4a9462",
    "sex": "F",
    "age_min": 70,
    "age_max": 74,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 11.89,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "64d867b6-3bcc-5aff-9f8d-d7d286819e5c",
    "sex": "F",
    "age_min": 70,
    "age_max": 74,
    "classification": "Baixo",
    "kg_min": 11.9,
    "kg_max": 17.19,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "e2aecc4e-c47e-5beb-a2a9-ccbfeee0e1d1",
    "sex": "F",
    "age_min": 70,
    "age_max": 74,
    "classification": "Médio",
    "kg_min": 17.2,
    "kg_max": 27.79,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "412d0eef-8885-52b6-9d7b-d43bd32ef96a",
    "sex": "F",
    "age_min": 70,
    "age_max": 74,
    "classification": "Alto",
    "kg_min": 27.8,
    "kg_max": 33.09,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "bd59c33d-9e3b-5de4-87d2-102896e2cc1b",
    "sex": "F",
    "age_min": 70,
    "age_max": 74,
    "classification": "Muito Alto",
    "kg_min": 33.1,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "dc228cab-e579-5793-9e62-c10fccf96041",
    "sex": "F",
    "age_min": 75,
    "age_max": 99,
    "classification": "Muito Baixo",
    "kg_min": 0,
    "kg_max": 9.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "09597e54-7164-51e9-b57d-bda5bbd00f5b",
    "sex": "F",
    "age_min": 75,
    "age_max": 99,
    "classification": "Baixo",
    "kg_min": 9.3,
    "kg_max": 14.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "f8f934f7-8c04-5420-9c03-d83bc3e0afe8",
    "sex": "F",
    "age_min": 75,
    "age_max": 99,
    "classification": "Médio",
    "kg_min": 14.3,
    "kg_max": 24.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "5b07d9bc-896a-553b-a21c-da962c37d35e",
    "sex": "F",
    "age_min": 75,
    "age_max": 99,
    "classification": "Alto",
    "kg_min": 24.3,
    "kg_max": 29.29,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  },
  {
    "id": "39d66adf-31bc-5854-b546-22cd763daa7c",
    "sex": "F",
    "age_min": 75,
    "age_max": 99,
    "classification": "Muito Alto",
    "kg_min": 29.3,
    "kg_max": 150,
    "source": "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-72; mão DIREITA)"
  }
];
