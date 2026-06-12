import React, { useRef, useEffect } from "react";
import { useJSONEditorState } from "./json-editor/useJSONEditorState";
import { InputPanel } from "./json-editor/InputPanel";
import { ControlDeck } from "./json-editor/ControlDeck";
import { OutputPanel } from "./json-editor/OutputPanel";

interface JSONEditorProps {
  mode: "formatter" | "validator" | "minifier";
}

export const JSONEditor: React.FC<JSONEditorProps> = ({ mode }) => {
  const state = useJSONEditorState({ mode });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Synced scroll body lock when panel goes fullscreen
  useEffect(() => {
    if (state.fullscreenPanel !== "none") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [state.fullscreenPanel]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to Trigger Page Mode Primary Action
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        state.triggerPrimaryAction();
      }
      // Esc key handling
      if (e.key === "Escape") {
        if (state.fullscreenPanel !== "none") {
          e.preventDefault();
          state.setFullscreenPanel("none");
          return;
        }
        if (document.activeElement === textareaRef.current) {
          e.preventDefault();
          state.handleClear();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state]);

  // Scroll to line when error banner or gutter is clicked (DX feature)
  const goToErrorLine = () => {
    if (!state.error || !textareaRef.current) return;
    const text = state.inputText;
    const lines = text.split("\n");
    let targetIndex = 0;

    for (let i = 0; i < Math.min(state.error.line - 1, lines.length); i++) {
      targetIndex += lines[i].length + 1; // +1 for the newline character
    }

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(targetIndex, targetIndex + (lines[state.error.line - 1]?.length || 0));

    const lineHeight = 24; // text-xs leading-6 is 24px line height
    textareaRef.current.scrollTop = Math.max(0, (state.error.line - 1) * lineHeight - 100);
  };

  const handleClearWithFocus = () => {
    state.handleClear();
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-6">
      {/* Workspace 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px_1fr] gap-6 flex-1 min-h-[600px] ui-scale-container">
        
        {/* COLUMN 1: Accessible Input Panel */}
        <InputPanel
          inputText={state.inputText}
          setInputText={state.setInputText}
          error={state.error}
          metrics={state.metrics}
          fullscreenPanel={state.fullscreenPanel}
          setFullscreenPanel={state.setFullscreenPanel}
          isDragging={state.isDragging}
          setIsDragging={state.setIsDragging}
          processUploadedFile={state.processUploadedFile}
          loadSample={state.loadSample}
          handlePrint={state.handlePrint}
          copyInput={state.copyInput}
          copiedInput={state.copiedInput}
          handleClear={handleClearWithFocus}
          textareaRef={textareaRef}
        />

        {/* COLUMN 2: Accessible Central Control Deck */}
        <ControlDeck
          mode={mode}
          validationStatus={state.validationStatus}
          inputText={state.inputText}
          outputText={state.outputText}
          outputMode={state.outputMode}
          setActiveTab={state.setActiveTab}
          historyList={state.historyList}
          isHistoryOpen={state.isHistoryOpen}
          setIsHistoryOpen={state.setIsHistoryOpen}
          setInputText={state.setInputText}
          clearHistory={state.clearHistory}
          isUriOpen={state.isUriOpen}
          setIsUriOpen={state.setIsUriOpen}
          uriInput={state.uriInput}
          setUriInput={state.setUriInput}
          uriLoading={state.uriLoading}
          uriError={state.uriError}
          handleFetchUri={state.handleFetchUri}
          setUriError={state.setUriError}
          handleFileUpload={state.handleFileUpload}
          triggerPrimaryAction={state.triggerPrimaryAction}
          runProcessing={state.runProcessing}
          downloadOutput={state.downloadOutput}
          handleClear={handleClearWithFocus}
          hudExpanded={state.hudExpanded}
          setHudExpanded={state.setHudExpanded}
          metrics={state.metrics}
          formatBytes={state.formatBytes}
          prefsExpanded={state.prefsExpanded}
          setPrefsExpanded={state.setPrefsExpanded}
          indentSize={state.indentSize}
          handleIndentChange={state.handleIndentChange}
          liveValidation={state.liveValidation}
          toggleLiveVal={state.toggleLiveVal}
          saveHistory={state.saveHistory}
          toggleHistorySave={state.toggleHistorySave}
          bigNumSupport={state.bigNumSupport}
          toggleBigNum={state.toggleBigNum}
        />

        {/* COLUMN 3: Accessible Output Inspector */}
        <OutputPanel
          error={state.error}
          parsedData={state.parsedData}
          outputText={state.outputText}
          inputText={state.inputText}
          outputMode={state.outputMode}
          outputSize={state.outputSize}
          activeTab={state.activeTab}
          setActiveTab={state.setActiveTab}
          copyOutput={state.copyOutput}
          copiedOutput={state.copiedOutput}
          downloadOutput={state.downloadOutput}
          fullscreenPanel={state.fullscreenPanel}
          setFullscreenPanel={state.setFullscreenPanel}
          goToErrorLine={goToErrorLine}
          formatBytes={state.formatBytes}
          treeSearch={state.treeSearch}
          setTreeSearch={state.setTreeSearch}
          showBadges={state.showBadges}
          setShowBadges={state.setShowBadges}
          expandAllFlag={state.expandAllFlag}
          collapseAllFlag={state.collapseAllFlag}
          triggerExpandAll={state.triggerExpandAll}
          triggerCollapseAll={state.triggerCollapseAll}
        />

      </div>
    </div>
  );
};
