import React, { useState, useEffect, useRef } from "react";
import { Module } from "../Module/Module";
import { SpiderChart } from "../SpiderChart/SpiderChart";
import { Overview } from "../Overview/Overview";
import { Report } from "../Report/Report";
import MaturityWidget from "../MaturityWidget/MaturityWidget"; // Import MaturityWidget
import { yamlParser } from "../../utils/yamlParser";
import { generateURL, exportToYAML } from "../../utils/urlGenerator";
import { exportToPDF } from "../../utils/pdfGenerator";
import { AssessmentData, ProgressData } from "../../types/types";
import LevelResult from "../../enums/LevelResult";
import {
  calculateOverallMaturityLevel,
  calculateModuleMaturityLevels,
} from "../../utils/maturityCalculations"; // Import utilities
import "./Assessment.module.scss";

interface AssessmentProps {
  src: string | null;
}

export const Assessment: React.FC<AssessmentProps> = ({ src }) => {
  const defaultProgressData = {
    level: 1,
    result: LevelResult[1],
    description: "",
    applicability: true,
  };

  const [data, setData] = useState<AssessmentData | null>(null);
  const [progress, setProgress] = useState<Record<string, ProgressData>>({});
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [assessmentName, setAssessmentName] = useState("");
  const [assessorName, setAssessorName] = useState("");
  const [useCaseDescription, setUseCaseDescription] = useState("");
  const chartRef = useRef<HTMLDivElement>(null);

  const STORAGE_KEY = "assessmentData";

  useEffect(() => {
    const urlHash = new URLSearchParams(window.location.hash.substring(1));
    const encodedProgress = urlHash.get("progress");
    const assessmentName = urlHash.get("assessmentName");
    const assessorName = urlHash.get("assessorName");
    const useCaseDescription = urlHash.get("useCaseDescription");

    const loadData = async () => {
      let initialData;
      if (src) {
        const response = await fetch(src);
        const yamlText = await response.text();
        initialData = yamlParser(yamlText);
      }
      setCurrentTab("overview");
      if (encodedProgress) {
        try {
          const decodedProgress = JSON.parse(atob(encodedProgress));
          setProgress(decodedProgress);
          setCurrentTab("report");
        } catch (error) {
          console.error("Error decoding progress from URL:", error);
          if (initialData) setProgress(initProgress(initialData));
        }
      } else {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
          const { progress, assessmentName, assessorName, useCaseDescription } =
            JSON.parse(storedData);
          setProgress(progress);
          setAssessmentName(assessmentName);
          setAssessorName(assessorName);
          setUseCaseDescription(useCaseDescription);
          setCurrentTab("report");
        } else {
          if (initialData) setProgress(initProgress(initialData));
        }
      }

      if (initialData) setData(initialData);

      if (assessmentName) setAssessmentName(atob(assessmentName));
      if (assessorName) setAssessorName(atob(assessorName));
      if (useCaseDescription) setUseCaseDescription(atob(useCaseDescription));
    };

    // Handle the promise returned from loadData
    loadData().catch((error) => console.error("Error loading data:", error));
  }, [src]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const storedData = JSON.parse(event.newValue || "{}");
        setProgress(storedData.progress);
        setAssessmentName(storedData.assessmentName);
        setAssessorName(storedData.assessorName);
        setUseCaseDescription(storedData.useCaseDescription);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (data) {
      const saveData = {
        progress,
        assessmentName,
        assessorName,
        useCaseDescription,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    }
  }, [progress, assessmentName, assessorName, useCaseDescription, data]);

  function initProgress(
    parsedData: AssessmentData | null,
  ): Record<string, ProgressData> {
    return (
      parsedData?.modules.reduce(
        (acc, module) => {
          module.categories.map((category) => {
            const progressData = { ...defaultProgressData };
            const levelOne = category.levels.find(
              (level) => level.number === 1,
            );
            if (levelOne) {
              progressData.description = levelOne.description;
            }
            acc[`${module.id}.${category.id}`] = progressData;
          });
          return acc;
        },
        {} as Record<string, ProgressData>,
      ) || {}
    );
  }

  const handleLevelChange = (
    moduleId: string,
    categoryId: string,
    level: number,
  ) => {
    setProgress((prevProgress) => ({
      ...prevProgress,
      [`${moduleId}.${categoryId}`]: {
        level,
        result: LevelResult[level] || defaultProgressData.result,
        description:
          data?.modules
            .find((module) => module.id === moduleId)
            ?.categories.find((category) => category.id === categoryId)
            ?.levels.find((l) => l.number === level)?.description ||
          defaultProgressData.description,
        applicability:
          prevProgress[`${moduleId}.${categoryId}`]?.applicability ||
          defaultProgressData.applicability,
      },
    }));
  };

  const handleApplicabilityChange = (moduleId: string, categoryId: string) => {
    setProgress((prevProgress) => ({
      ...prevProgress,
      [`${moduleId}.${categoryId}`]: {
        level:
          prevProgress[`${moduleId}.${categoryId}`]?.level ||
          defaultProgressData.level,
        description:
          prevProgress[`${moduleId}.${categoryId}`]?.description ||
          defaultProgressData.description,
        result: prevProgress[`${moduleId}.${categoryId}`]?.applicability
          ? LevelResult[-1]
          : LevelResult[prevProgress[`${moduleId}.${categoryId}`]?.level],
        applicability:
          !prevProgress[`${moduleId}.${categoryId}`]?.applicability,
      },
    }));
  };

  const handleReset = () => {
    setProgress(initProgress(data));
    setAssessmentName("");
    setAssessorName("");
    setUseCaseDescription("");
  };

  const handleShare = () => {
    const url = generateURL(
      progress,
      assessmentName,
      assessorName,
      useCaseDescription,
    );
    navigator.clipboard
      .writeText(url)
      .then(() => alert("Progress URL copied to clipboard!"))
      .catch((error) =>
        console.error("Error copying URL to clipboard:", error),
      );
  };

  const handleExportYAML = () => {
    exportToYAML(progress, assessmentName, assessorName, useCaseDescription);
  };

  const handleExportPDF = () => {
    if (chartRef.current && data) {
      const overallMaturityLevel = calculateOverallMaturityLevel(
        data.modules,
        progress,
      );
      const moduleMaturityLevels = calculateModuleMaturityLevels(
        data.modules,
        progress,
      );
      exportToPDF(
        progress,
        chartRef.current,
        overallMaturityLevel,
        moduleMaturityLevels,
        data.modules,
        assessmentName,
        assessorName,
        useCaseDescription,
      ).catch((error) => console.error("Error exporting to PDF:", error));
    }
  };

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    setIsMenuOpen(false); // Close the menu when a tab is clicked
    const scrollQuerySelector = getComputedStyle(
      document.documentElement,
    ).getPropertyValue("--pkimm-scroll-query-selector");
    if (scrollQuerySelector === "window") {
      window.scrollTo(0, 0);
    } else {
      const element = document.querySelector(scrollQuerySelector);
      if (element) {
        element.scrollTo(0, 0);
      }
    }
  };

  const handleAssessmentName = (name: string) => {
    setAssessmentName(name);
  };

  const handleAssessorName = (name: string) => {
    setAssessorName(name);
  };

  const handleUseCaseDescription = (description: string) => {
    setUseCaseDescription(description);
  };

  const chartLabels =
    data?.modules.reduce((acc, module) => {
      module.categories.forEach((category) => {
        acc.push(`${module.id}.${category.id}`);
      });
      return acc;
    }, [] as string[]) || [];

  const getNextModuleId = () => {
    if (!data || !currentTab) return null;
    const currentIndex = data.modules.findIndex(
      (module) => module.id === currentTab,
    );
    if (currentIndex === -1 || currentIndex === data.modules.length - 1)
      return null;
    return data.modules[currentIndex + 1].id;
  };
  getNextModuleId();
  data ? calculateOverallMaturityLevel(data.modules, progress) : 0;
  const moduleMaturityLevels = data
    ? calculateModuleMaturityLevels(data.modules, progress)
    : [];

  return (
    <div className="pkimm-assessment-container">
      <div
        className="pkimm-burger-menu"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <div className={`bar1 ${isMenuOpen ? "active" : ""}`}></div>
        <div className={`bar2 ${isMenuOpen ? "active" : ""}`}></div>
        <div className={`bar3 ${isMenuOpen ? "active" : ""}`}></div>
      </div>
      <div className={`pkimm-tabs ${isMenuOpen ? "active" : ""}`}>
        <button
          className={currentTab === "overview" ? "active" : ""}
          onClick={() => handleTabClick("overview")}
        >
          Overview
        </button>
        {data?.modules.map((module) => (
          <button
            key={module.id}
            className={module.id === currentTab ? "active" : ""}
            onClick={() => handleTabClick(module.id)}
          >
            {module.name}
          </button>
        ))}
        <button
          className={currentTab === "report" ? "active" : ""}
          onClick={() => handleTabClick("report")}
        >
          Report
        </button>
        <img
          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjU2IDMyNCI+Cgk8c3R5bGU+CgkJdHNwYW4geyB3aGl0ZS1zcGFjZTogcHJlIH0KCQkuc2hwMCB7IGZpbGw6IGJsYWNrIH0gCgk8L3N0eWxlPgoJPHBhdGggaWQ9Ik5hbWUiIGNsYXNzPSJzaHAwIiBkPSJNNDQxLjUgMTY1LjYzTDQ0MS41IDE3LjdMNTYwLjAyIDE3LjdDNTY4LjA0IDE3LjcgNTc1LjAzIDIwLjU4IDU4MSAyNi4zNEM1ODYuNzYgMzIuMyA1ODkuNjQgMzkuMyA1ODkuNjQgNDcuMzJMNTg5LjY0IDg2LjQxQzU4OS42NCA5NC40NCA1ODYuNzYgMTAxLjIzIDU4MSAxMDYuOTlDNTc1LjAzIDExMi45NiA1NjguMDQgMTE1Ljg0IDU2MC4wMiAxMTUuODRMNDcxLjEzIDExNi4wNUw0NzEuMTMgMTY1LjYzTDQ0MS41IDE2NS42M1pNNDc3LjkyIDg2LjIxTDU1Mi44MSA4Ni4yMUM1NTYuOTMgODYuMjEgNTU5LjE5IDg2LjAxIDU1OS40IDg1LjhDNTU5LjYgODUuNTkgNTU5LjgxIDgzLjMzIDU1OS44MSA3OS4yMUw1NTkuODEgNTQuMTFDNTU5LjgxIDUwIDU1OS42IDQ3Ljc0IDU1OS40IDQ3LjUzQzU1OS4xOSA0Ny4zMiA1NTYuOTMgNDcuMzIgNTUyLjgxIDQ3LjMyTDQ3Ny45MiA0Ny4zMkM0NzMuODEgNDcuMzIgNDcxLjc1IDQ3LjMyIDQ3MS41NCA0Ny41M0M0NzEuMzQgNDcuNzQgNDcxLjEzIDUwIDQ3MS4xMyA1NC4xMUw0NzEuMTMgNzkuMjFDNDcxLjEzIDgzLjMzIDQ3MS4zNCA4NS41OSA0NzEuNTQgODUuOEM0NzEuNzUgODYuMDEgNDczLjgxIDg2LjIxIDQ3Ny45MiA4Ni4yMVpNNjM0LjA2IDE2NS42M0w2MzQuMDYgMTcuNDlMNjYzLjg5IDE3LjQ5TDY2My44OSA3Ni43NEw2OTUuNzggNzYuNzRMNzQ1LjM3IDE3LjQ5TDc3Ni44NSAxNy40OUw3NzYuODUgMjYuOTVMNzIyLjUzIDkxLjU2TDc3Ni44NSAxNTYuMTdMNzc2Ljg1IDE2NS42M0w3NDUuMzcgMTY1LjYzTDY5NS43OCAxMDYuMzhMNjYzLjg5IDEwNi4zOEw2NjMuODkgMTY1LjYzTDYzNC4wNiAxNjUuNjNaTTgyNi42MiAxNjUuNjNMODI2LjYyIDE3LjQ5TDg1NS44NCAxNy40OUw4NTUuODQgMTY1LjYzTDgyNi42MiAxNjUuNjNaTTQ1Ny4yOCAzMDYuNTNDNDUyLjk2IDMwNi41MyA0NDkuMjIgMzA1LjAxIDQ0Ni4xOSAzMDEuODZDNDQzLjA0IDI5OC44MyA0NDEuNTIgMjk1LjA5IDQ0MS41MiAyOTAuNzdMNDQxLjUyIDIzOC4yNUM0NDEuNTIgMjMzLjkzIDQ0My4wNCAyMzAuMTkgNDQ2LjE5IDIyNy4wNEM0NDkuMjIgMjI0LjAxIDQ1Mi45NiAyMjIuNDkgNDU3LjI4IDIyMi40OUw1MjUuMzMgMjIyLjQ5TDUyNS4zMyAyMzYuNjFMNDU5LjczIDIzNi42MUM0NTcuNzQgMjM2LjYxIDQ1Ni41OCAyMzYuODUgNDU2LjIyIDIzNy4yQzQ1NS43NiAyMzcuNTUgNDU1LjUzIDIzOC43MSA0NTUuNTMgMjQwLjdMNDU1LjUzIDI4OC4zMkM0NTUuNTMgMjkwLjMxIDQ1NS43NiAyOTEuNDcgNDU2LjIyIDI5MS44MkM0NTYuNTggMjkyLjE3IDQ1Ny43NCAyOTIuNDEgNDU5LjczIDI5Mi40MUw1MjUuMzMgMjkyLjQxTDUyNS4zMyAzMDYuNTNMNDU3LjI4IDMwNi41M1pNNTYyLjIgMzA2LjUzQzU1Ny44OCAzMDYuNTMgNTU0LjI3IDMwNS4wMSA1NTEuMjMgMzAxLjg2QzU0OC4wOCAyOTguODMgNTQ2LjU2IDI5NS4yMSA1NDYuNTYgMjkwLjg5TDU0Ni41NiAyNTQuNDdDNTQ2LjU2IDI1MC4xNSA1NDguMDggMjQ2LjUzIDU1MS4yMyAyNDMuMzhDNTU0LjI3IDI0MC4zNSA1NTcuODggMjM4LjgzIDU2Mi4yIDIzOC44M0w1OTkuNjcgMjM4LjgzQzYwMy45OSAyMzguODMgNjA3LjczIDI0MC4zNSA2MTAuNzYgMjQzLjM4QzYxMy43OSAyNDYuNTMgNjE1LjMxIDI1MC4xNSA2MTUuMzEgMjU0LjQ3TDYxNS4zMSAyOTAuODlDNjE1LjMxIDI5NS4yMSA2MTMuNzkgMjk4LjgzIDYxMC43NiAzMDEuODZDNjA3LjczIDMwNS4wMSA2MDMuOTkgMzA2LjUzIDU5OS42NyAzMDYuNTNMNTYyLjIgMzA2LjUzWk01NjQuNjUgMjkyLjY0TDU5Ny4yMiAyOTIuNjRDNTk5LjIgMjkyLjY0IDYwMC4zNyAyOTIuNDEgNjAwLjg0IDI5MS45NEM2MDEuMTkgMjkxLjU5IDYwMS40MiAyOTAuNDIgNjAxLjQyIDI4OC40NEw2MDEuNDIgMjU2LjkyQzYwMS40MiAyNTQuOTQgNjAxLjE5IDI1My43NyA2MDAuODQgMjUzLjNDNjAwLjM3IDI1Mi45NSA1OTkuMiAyNTIuNzIgNTk3LjIyIDI1Mi43Mkw1NjQuNjUgMjUyLjcyQzU2Mi42NyAyNTIuNzIgNTYxLjUgMjUyLjk1IDU2MS4xNSAyNTMuM0M1NjAuNjkgMjUzLjc3IDU2MC40NSAyNTQuOTQgNTYwLjQ1IDI1Ni45Mkw1NjAuNDUgMjg4LjQ0QzU2MC40NSAyOTAuNDIgNTYwLjY5IDI5MS41OSA1NjEuMTUgMjkxLjk0QzU2MS41IDI5Mi40MSA1NjIuNjcgMjkyLjY0IDU2NC42NSAyOTIuNjRaTTYzNC43OSAzMDYuNTNMNjM0Ljc5IDIzOC44M0w2ODguMDIgMjM4LjgzQzY5Mi4zNCAyMzguODMgNjk1Ljk2IDI0MC4zNSA2OTguOTkgMjQzLjM4QzcwMi4wMyAyNDYuNTMgNzAzLjU0IDI1MC4xNSA3MDMuNTQgMjU0LjQ3TDcwMy41NCAzMDYuNTNMNjg5LjY1IDMwNi41M0w2ODkuNjUgMjU2LjkyQzY4OS42NSAyNTQuOTQgNjg5LjQyIDI1My43NyA2ODkuMDcgMjUzLjNDNjg4LjYgMjUyLjk1IDY4Ny40NCAyNTIuNzIgNjg1LjQ1IDI1Mi43Mkw2NTMgMjUyLjcyQzY1MS4wMiAyNTIuNzIgNjQ5Ljg1IDI1Mi45NSA2NDkuMzggMjUzLjNDNjQ4LjkyIDI1My43NyA2NDguNjggMjU0Ljk0IDY0OC42OCAyNTYuOTJMNjQ4LjY4IDMwNi41M0w2MzQuNzkgMzA2LjUzWk03MzkuMzcgMzA2LjUzQzczNS4wNSAzMDYuNTMgNzMxLjQzIDMwNS4wMSA3MjguNCAzMDEuODZDNzI1LjI0IDI5OC44MyA3MjMuNzMgMjk1LjIxIDcyMy43MyAyOTAuODlMNzIzLjczIDI4OC42N0w3MzcuNjIgMjg4LjY3TDczNy42MiAyODkuNDlDNzM3LjYyIDI5MC43NyA3MzcuODUgMjkxLjU5IDczOC4zMiAyOTEuOTRDNzM4LjY3IDI5Mi40MSA3MzkuNDkgMjkyLjY0IDc0MC43NyAyOTIuNjRMNzc1LjQ0IDI5Mi42NEM3NzYuNzIgMjkyLjY0IDc3Ny41NCAyOTIuNDEgNzc4LjAxIDI5MS45NEM3NzguMzUgMjkxLjU5IDc3OC41OSAyOTAuNzcgNzc4LjU5IDI4OS40OUw3NzguNTkgMjgyLjg0Qzc3OC41OSAyODEuNTUgNzc4LjM1IDI4MC43MyA3NzguMDEgMjgwLjI3Qzc3Ny41NCAyNzkuOTIgNzc2LjcyIDI3OS42OSA3NzUuNDQgMjc5LjY5TDczOS4zNyAyNzkuNjlDNzM1LjA1IDI3OS42OSA3MzEuNDMgMjc4LjE3IDcyOC40IDI3NS4wMkM3MjUuMjQgMjcxLjk4IDcyMy43MyAyNjguMzYgNzIzLjczIDI2NC4wNEw3MjMuNzMgMjU0LjQ3QzcyMy43MyAyNTAuMTUgNzI1LjI0IDI0Ni41MyA3MjguNCAyNDMuMzhDNzMxLjQzIDI0MC4zNSA3MzUuMDUgMjM4LjgzIDczOS4zNyAyMzguODNMNzc2Ljg0IDIzOC44M0M3ODEuMTYgMjM4LjgzIDc4NC44OSAyNDAuMzUgNzg4LjA0IDI0My4zOEM3OTEuMDggMjQ2LjUzIDc5Mi41OSAyNTAuMTUgNzkyLjU5IDI1NC40N0w3OTIuNTkgMjU2LjY5TDc3OC41OSAyNTYuNjlMNzc4LjU5IDI1NS44N0M3NzguNTkgMjU0LjU5IDc3OC4zNSAyNTMuNzcgNzc4LjAxIDI1My4zQzc3Ny41NCAyNTIuOTUgNzc2LjcyIDI1Mi43MiA3NzUuNDQgMjUyLjcyTDc0MC43NyAyNTIuNzJDNzM5LjQ5IDI1Mi43MiA3MzguNjcgMjUyLjk1IDczOC4zMiAyNTMuM0M3MzcuODUgMjUzLjc3IDczNy42MiAyNTQuNTkgNzM3LjYyIDI1NS44N0w3MzcuNjIgMjYyLjUyQzczNy42MiAyNjMuODEgNzM3Ljg1IDI2NC42MyA3MzguMzIgMjY0Ljk4QzczOC42NyAyNjUuNDQgNzM5LjQ5IDI2NS42OCA3NDAuNzcgMjY1LjY4TDc3Ni44NCAyNjUuNjhDNzgxLjE2IDI2NS42OCA3ODQuODkgMjY3LjE5IDc4OC4wNCAyNzAuMjNDNzkxLjA4IDI3My4zOCA3OTIuNTkgMjc3IDc5Mi41OSAyODEuMzJMNzkyLjU5IDI5MC44OUM3OTIuNTkgMjk1LjIxIDc5MS4wOCAyOTguODMgNzg4LjA0IDMwMS44NkM3ODQuODkgMzA1LjAxIDc4MS4xNiAzMDYuNTMgNzc2Ljg0IDMwNi41M0w3MzkuMzcgMzA2LjUzWk04MjguMTkgMzA2LjUzQzgyMy44NyAzMDYuNTMgODIwLjI1IDMwNS4wMSA4MTcuMjIgMzAxLjg2QzgxNC4wNiAyOTguODMgODEyLjU1IDI5NS4yMSA4MTIuNTUgMjkwLjg5TDgxMi41NSAyNTQuNDdDODEyLjU1IDI1MC4xNSA4MTQuMDYgMjQ2LjUzIDgxNy4yMiAyNDMuMzhDODIwLjI1IDI0MC4zNSA4MjMuODcgMjM4LjgzIDgyOC4xOSAyMzguODNMODY1LjY2IDIzOC44M0M4NjkuOTggMjM4LjgzIDg3My43MSAyNDAuMzUgODc2Ljc0IDI0My4zOEM4NzkuNzggMjQ2LjUzIDg4MS4zIDI1MC4xNSA4ODEuMyAyNTQuNDdMODgxLjMgMjkwLjg5Qzg4MS4zIDI5NS4yMSA4NzkuNzggMjk4LjgzIDg3Ni43NCAzMDEuODZDODczLjcxIDMwNS4wMSA4NjkuOTggMzA2LjUzIDg2NS42NiAzMDYuNTNMODI4LjE5IDMwNi41M1pNODMwLjY0IDI5Mi42NEw4NjMuMjEgMjkyLjY0Qzg2NS4xOSAyOTIuNjQgODY2LjM2IDI5Mi40MSA4NjYuODIgMjkxLjk0Qzg2Ny4xNyAyOTEuNTkgODY3LjQxIDI5MC40MiA4NjcuNDEgMjg4LjQ0TDg2Ny40MSAyNTYuOTJDODY3LjQxIDI1NC45NCA4NjcuMTcgMjUzLjc3IDg2Ni44MiAyNTMuM0M4NjYuMzYgMjUyLjk1IDg2NS4xOSAyNTIuNzIgODYzLjIxIDI1Mi43Mkw4MzAuNjQgMjUyLjcyQzgyOC42NiAyNTIuNzIgODI3LjQ5IDI1Mi45NSA4MjcuMTQgMjUzLjNDODI2LjY3IDI1My43NyA4MjYuNDQgMjU0Ljk0IDgyNi40NCAyNTYuOTJMODI2LjQ0IDI4OC40NEM4MjYuNDQgMjkwLjQyIDgyNi42NyAyOTEuNTkgODI3LjE0IDI5MS45NEM4MjcuNDkgMjkyLjQxIDgyOC42NiAyOTIuNjQgODMwLjY0IDI5Mi42NFpNOTAwLjkgMzA2LjUzTDkwMC45IDI1NC40N0M5MDAuOSAyNTAuMTUgOTAyLjQxIDI0Ni41MyA5MDUuNTcgMjQzLjM4QzkwOC42IDI0MC4zNSA5MTIuMjIgMjM4LjgzIDkxNi41NCAyMzguODNMOTU0LjI0IDIzOC44M0w5NTQuMjQgMjUyLjcyTDkxOC45OSAyNTIuNzJDOTE3LjAxIDI1Mi43MiA5MTUuODQgMjUyLjk1IDkxNS40OSAyNTMuM0M5MTUuMDIgMjUzLjc3IDkxNC43OSAyNTQuOTQgOTE0Ljc5IDI1Ni45Mkw5MTQuNzkgMzA2LjUzTDkwMC45IDMwNi41M1pNOTg2LjkxIDMwNi41M0M5ODIuNTkgMzA2LjUzIDk3OC44NiAzMDUuMDEgOTc1LjgzIDMwMS44NkM5NzIuNzkgMjk4LjgzIDk3MS4yNyAyOTUuMjEgOTcxLjI3IDI5MC44OUw5NzEuMjcgMjE3LjdMOTg1LjE2IDIxNy43TDk4NS4xNiAyMzguODNMMTAxMi4yNCAyMzguODNMMTAxMi4yNCAyNTIuNzJMOTg1LjE2IDI1Mi43Mkw5ODUuMTYgMjg4LjQ0Qzk4NS4xNiAyOTAuNDIgOTg1LjQgMjkxLjU5IDk4NS44NiAyOTEuOTRDOTg2LjIxIDI5Mi40MSA5ODcuMzggMjkyLjY0IDk4OS4zNyAyOTIuNjRMMTAxMi4yNCAyOTIuNjRMMTAxMi4yNCAzMDYuNTNMOTg2LjkxIDMwNi41M1pNMTAzMS40OSAzMDYuNTNMMTAzMS40OSAyMzguODNMMTA0NS4zOCAyMzguODNMMTA0NS4zOCAzMDYuNTNMMTAzMS40OSAzMDYuNTNaTTEwMzEuNDkgMjMwLjY2TDEwMzEuNDkgMjE2LjY1TDEwNDUuMzggMjE2LjY1TDEwNDUuMzggMjMwLjY2TDEwMzEuNDkgMjMwLjY2Wk0xMDgyLjQ5IDMwNi41M0MxMDc4LjE3IDMwNi41MyAxMDc0LjQ0IDMwNS4wMSAxMDcxLjQgMzAxLjg2QzEwNjguMzYgMjk4LjgzIDEwNjYuODUgMjk1LjIxIDEwNjYuODUgMjkwLjg5TDEwNjYuODUgMjM4LjgzTDEwODAuNzQgMjM4LjgzTDEwODAuNzQgMjg4LjQ0QzEwODAuNzQgMjkwLjQyIDEwODAuOTcgMjkxLjU5IDEwODEuNDQgMjkxLjk0QzEwODEuNzkgMjkyLjQxIDEwODIuOTYgMjkyLjY0IDEwODQuOTQgMjkyLjY0TDExMTcuNTEgMjkyLjY0QzExMTkuNDkgMjkyLjY0IDExMjAuNjYgMjkyLjQxIDExMjEuMTIgMjkxLjk0QzExMjEuNDcgMjkxLjU5IDExMjEuNzEgMjkwLjQyIDExMjEuNzEgMjg4LjQ0TDExMjEuNzEgMjM4LjgzTDExMzUuNiAyMzguODNMMTEzNS42IDI5MC44OUMxMTM1LjYgMjk1LjIxIDExMzQuMDggMjk4LjgzIDExMzEuMDUgMzAxLjg2QzExMjguMDEgMzA1LjAxIDExMjQuMjggMzA2LjUzIDExMTkuOTYgMzA2LjUzTDEwODIuNDkgMzA2LjUzWk0xMTU0Ljk3IDMwNi41M0wxMTU0Ljk3IDIzOC44M0wxMjQwLjE4IDIzOC44M0MxMjQ0LjQ5IDIzOC44MyAxMjQ4LjIzIDI0MC4zNSAxMjUxLjI2IDI0My4zOEMxMjU0LjMgMjQ2LjUzIDEyNTUuODIgMjUwLjE1IDEyNTUuODIgMjU0LjQ3TDEyNTUuODIgMzA2LjUzTDEyNDEuOTMgMzA2LjUzTDEyNDEuOTMgMjU2LjkyQzEyNDEuOTMgMjU0Ljk0IDEyNDEuNjkgMjUzLjc3IDEyNDEuMzQgMjUzLjNDMTI0MC44NyAyNTIuOTUgMTIzOS43MSAyNTIuNzIgMTIzNy43MiAyNTIuNzJMMTIxNi43MSAyNTIuNzJDMTIxNC43MyAyNTIuNzIgMTIxMy41NiAyNTIuOTUgMTIxMy4yMSAyNTMuM0MxMjEyLjc0IDI1My43NyAxMjEyLjUxIDI1NC45NCAxMjEyLjUxIDI1Ni45MkwxMjEyLjUxIDMwNi41M0wxMTk4LjM5IDMwNi41M0wxMTk4LjM5IDI1Ni45MkMxMTk4LjM5IDI1NC45NCAxMTk4LjE1IDI1My43NyAxMTk3LjggMjUzLjNDMTE5Ny40NSAyNTIuOTUgMTE5Ni4yOSAyNTIuNzIgMTE5NC4zIDI1Mi43MkwxMTczLjE4IDI1Mi43MkMxMTcxLjE5IDI1Mi43MiAxMTcwLjAyIDI1Mi45NSAxMTY5LjY3IDI1My4zQzExNjkuMjEgMjUzLjc3IDExNjguOTcgMjU0Ljk0IDExNjguOTcgMjU2LjkyTDExNjguOTcgMzA2LjUzTDExNTQuOTcgMzA2LjUzWiIgLz4KCTxnIGlkPSJFbGVtZW50Ij4KCQk8cGF0aCBpZD0iQm90dG9tIiBjbGFzcz0ic2hwMCIgZD0iTTE4NS44MiAyODkuMzRDMTc3LjQyIDMwMy44OCAxNzUuNzggMzIzLjk2IDE1Ny4wMiAzMjMuOTZDMTM4LjI1IDMyMy45NiAxMzYuNiAzMDMuODggMTI4LjIxIDI4OS4zNEMxMDAuMTEgMjgzLjcyIDc0LjkyIDI3MC4wNCA1NS4xNiAyNTAuODFMNjkuNTcgMjM3LjE5QzkyLjI2IDI1OC45NyAxMjMuMDcgMjcyLjM2IDE1Ny4wMiAyNzIuMzZDMTkwLjk2IDI3Mi4zNiAyMjEuNzcgMjU4Ljk3IDI0NC40NSAyMzcuMTlMMjU4Ljg2IDI1MC44MUMyMzkuMSAyNzAuMDQgMjEzLjkyIDI4My43MiAxODUuODIgMjg5LjM0WiIgLz4KCQk8cGF0aCBpZD0iUmlnaHQiIGNsYXNzPSJzaHAwIiBkPSJNMTk2Ljc3IDUuNTJDMjIxLjEyIDEyLjM5IDI0Mi45IDI1LjQyIDI2MC4zIDQyLjgyQzI2Mi40NyA0NSAyNjQuNTggNDcuMjQgMjY2LjYxIDQ5LjU1QzI4My40MSA0OS41NSAzMDEuNjYgNDAuOTMgMzExLjA1IDU3LjE4QzMyMC40MiA3My40MyAzMDMuODYgODQuODkgMjk1LjQ2IDk5LjQzQzMwMC40IDExNC4wOSAzMDMuMDggMTI5Ljc5IDMwMy4wOCAxNDYuMTFDMzAzLjA4IDE1OC40OCAzMDEuNTQgMTcwLjUgMjk4LjY1IDE4MS45N0wyNzkuNjQgMTc2LjNDMjgyLjAxIDE2Ni42MyAyODMuMjggMTU2LjUyIDI4My4yOCAxNDYuMTFDMjgzLjI4IDExMS4yNCAyNjkuMTQgNzkuNjcgMjQ2LjMgNTYuODNDMjMxLjQ0IDQxLjk4IDIxMi45MSAzMC44MSAxOTIuMTggMjQuODFMMTk2Ljc3IDUuNTJaIiAvPgoJCTxwYXRoIGlkPSJMZWZ0IiBjbGFzcz0ic2hwMCIgZD0iTTE4LjM3IDk5LjkxQzkuOTggODUuMzcgLTYuNTkgNzMuOTEgMi43OSA1Ny42NkMxMi4xOCA0MS40MSAzMC40MiA1MC4wMyA0Ny4yMiA1MC4wM0M0OS4yNiA0Ny43MiA1MS4zNiA0NS40OCA1My41NCA0My4zQzcwLjk0IDI1LjkgOTIuNzEgMTIuODcgMTE3LjA3IDZMMTIxLjY2IDI1LjI5QzEwMC45MyAzMS4yOSA4Mi4zOSA0Mi40NiA2Ny41NCA1Ny4zMUM0NC43IDgwLjE1IDMwLjU2IDExMS43MiAzMC41NiAxNDYuNTlDMzAuNTYgMTU3IDMxLjgzIDE2Ny4xMSAzNC4yIDE3Ni43OEwxNS4xOSAxODIuNDVDMTIuMyAxNzAuOTggMTAuNzYgMTU4Ljk2IDEwLjc2IDE0Ni41OUMxMC43NiAxMzAuMjcgMTMuNDMgMTE0LjU3IDE4LjM3IDk5LjkxWiIgLz4KCQk8cGF0aCBpZD0iVGFibGUiIGNsYXNzPSJzaHAwIiBkPSJNMjI3LjI0IDc1Ljg4QzI0NS4yMiA5My44NSAyNTYuMzMgMTE4LjY4IDI1Ni4zMyAxNDYuMTFDMjU2LjMzIDE2MC42OCAyNTMuMTkgMTc0LjUzIDI0Ny41NSAxODYuOTlMMjg4LjQ1IDIxMC42MUwyNzguNjIgMjI3LjcxTDIzNy42NyAyMDQuMDZDMjM0LjUzIDIwOC40MyAyMzEuMDQgMjEyLjU0IDIyNy4yNCAyMTYuMzRDMjA5LjI2IDIzNC4zMSAxODQuNDMgMjQ1LjQzIDE1Ny4wMiAyNDUuNDNDMTI5LjU5IDI0NS40MyAxMDQuNzYgMjM0LjMxIDg2Ljc4IDIxNi4zNEM4Mi45OSAyMTIuNTQgNzkuNSAyMDguNDMgNzYuMzYgMjA0LjA2TDM1LjQxIDIyNy43MUwyNS41OCAyMTAuNjFMNjYuNDggMTg2Ljk5QzYwLjg0IDE3NC41MyA1Ny42OSAxNjAuNjggNTcuNjkgMTQ2LjExQzU3LjY5IDExOC42OCA2OC44MSA5My44NSA4Ni43OCA3NS44OEMxMDIuNTcgNjAuMSAxMjMuNjQgNDkuNiAxNDcuMTEgNDcuMjhMMTQ3LjExIDAuMDRMMTY2LjkyIDAuMDRMMTY2LjkyIDQ3LjI4QzE5MC4zOSA0OS42IDIxMS40NiA2MC4xIDIyNy4yNCA3NS44OFpNMjEzLjIzIDg5Ljg5QzE5OC44NSA3NS41IDE3OC45NyA2Ni42IDE1Ny4wMiA2Ni42QzEzNS4wNiA2Ni42IDExNS4xOCA3NS41IDEwMC43OSA4OS44OUM4Ni40IDEwNC4yNyA3Ny41IDEyNC4xNSA3Ny41IDE0Ni4xMUM3Ny41IDE2OC4wNiA4Ni40IDE4Ny45NCAxMDAuNzkgMjAyLjMzQzExNS4xOCAyMTYuNzIgMTM1LjA2IDIyNS42MSAxNTcuMDIgMjI1LjYxQzE3OC45NyAyMjUuNjEgMTk4Ljg1IDIxNi43MiAyMTMuMjMgMjAyLjMzQzIyNy42MyAxODcuOTUgMjM2LjUzIDE2OC4wNiAyMzYuNTMgMTQ2LjExQzIzNi41MyAxMjQuMTUgMjI3LjYzIDEwNC4yNyAyMTMuMjMgODkuODlaIiAvPgoJCTxwYXRoIGlkPSJLZXlob2xlIiBjbGFzcz0ic2hwMCIgZD0iTTE0Ni4wNCAxNDEuODFMMTMyLjMxIDE5NC45NUwxODEuNzIgMTk0Ljk1TDE2Ny45OSAxNDEuODFDMTc1LjUxIDEzNy44NiAxODAuNjQgMTI5Ljk3IDE4MC42NCAxMjAuODlDMTgwLjY0IDEwNy44NSAxNzAuMDYgOTcuMjcgMTU3LjAyIDk3LjI3QzE0My45NyA5Ny4yNyAxMzMuMzkgMTA3Ljg1IDEzMy4zOSAxMjAuODlDMTMzLjM5IDEyOS45NyAxMzguNTIgMTM3Ljg2IDE0Ni4wNCAxNDEuODFaIiAvPgoJPC9nPgo8L3N2Zz4="
          alt="PKI Consortium Logo"
          className="pkimm-logo"
        />
      </div>
      <div className="pkimm-content-container">
        <div className="pkimm-categories-container">
          {currentTab === "overview" && data && (
            <div>
              <Overview />
              {data.modules.length > 0 && (
                <button
                  className="continue-button"
                  onClick={() => handleTabClick(data.modules[0].id)}
                >
                  Continue to {data.modules[0].name}
                </button>
              )}
            </div>
          )}
          {data?.modules.map(
            (module, index) =>
              module.id === currentTab && (
                <div key={module.id}>
                  <Module
                    key={module.id}
                    module={module}
                    progress={progress}
                    onLevelChange={handleLevelChange}
                    onApplicabilityChange={handleApplicabilityChange}
                  />
                  {index === data.modules.length - 1 ? (
                    <button
                      className="continue-button"
                      onClick={() => handleTabClick("report")}
                    >
                      Continue to Report
                    </button>
                  ) : (
                    <button
                      className="continue-button"
                      onClick={() => handleTabClick(data.modules[index + 1].id)}
                    >
                      Continue to {data.modules[index + 1].name}
                    </button>
                  )}
                </div>
              ),
          )}
          {currentTab === "report" && data && (
            <Report
              modules={data.modules}
              progress={progress}
              assessmentName={assessmentName}
              assessorName={assessorName}
              useCaseDescription={useCaseDescription}
              onShare={handleShare}
              onExportYAML={handleExportYAML}
              onExportPDF={handleExportPDF}
              onReset={handleReset}
              onAssessmentName={handleAssessmentName}
              onAssessorName={handleAssessorName}
              onUseCaseDescription={handleUseCaseDescription}
            />
          )}
        </div>
        <div className="pkimm-chart-container" ref={chartRef}>
          {data && (
            <SpiderChart
              modules={data.modules}
              progress={progress}
              chartLabels={chartLabels}
            />
          )}
          {data && (
            <>
              {moduleMaturityLevels.map(({ module, level }) => (
                <MaturityWidget
                  key={module}
                  level={level}
                  label={`${module}`}
                  className="pkimm-assessment-maturity-widget"
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
